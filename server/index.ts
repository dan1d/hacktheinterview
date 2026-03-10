import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { createSession, getSession, broadcastToAll } from "./sessions.js";
import { startTranscription, sendAudio, stopTranscription } from "./deepgram.js";
import pdf from "pdf-parse";

const app = new Hono();

// API routes
app.post("/api/session", async (c) => {
  const formData = await c.req.formData();
  const interviewType = (formData.get("interviewType") as string) || "general";
  const customPrompt = (formData.get("customPrompt") as string) || "";
  const resumeFile = formData.get("resume") as File | null;

  let resumeText = "";
  if (resumeFile) {
    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    try {
      const parsed = await (pdf as any)(buffer);
      resumeText = parsed.text;
    } catch (e) {
      console.error("PDF parse error:", e);
    }
  }

  const session = createSession({ interviewType, customPrompt, resumeText });
  return c.json({ sessionId: session.id });
});

app.get("/api/session/:id", (c) => {
  const session = getSession(c.req.param("id"));
  if (!session) return c.json({ error: "Session not found" }, 404);
  return c.json({
    id: session.id,
    interviewType: session.interviewType,
    isCalibrated: session.isCalibrated,
    isLive: session.isLive,
    transcript: session.transcript,
    answers: session.answers,
  });
});

// Serve static files (built client)
app.use("/*", serveStatic({ root: "./client/dist" }));

// SPA fallback
app.get("/*", async (c) => {
  try {
    const fs = await import("fs");
    const html = fs.readFileSync("./client/dist/index.html", "utf-8");
    return c.html(html);
  } catch {
    return c.text("Build the client first: npm run build:client", 404);
  }
});

// Create HTTP server
const httpServer = createServer(app.fetch as any);

// WebSocket server
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws: WebSocket, req) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("sessionId");
  const role = url.searchParams.get("role"); // "listener" or "reader"

  if (!sessionId || !role) {
    ws.close(4000, "Missing sessionId or role");
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    ws.close(4001, "Session not found");
    return;
  }

  console.log(`[WS] ${role} connected to session ${sessionId}`);

  if (role === "listener") {
    session.listeners.add(ws);

    ws.on("message", (data: Buffer | string) => {
      if (typeof data === "string") {
        const msg = JSON.parse(data);

        if (msg.type === "start_calibration") {
          session.isCalibrated = false;
          ws.send(JSON.stringify({ type: "calibration_started" }));
        } else if (msg.type === "end_calibration") {
          session.isCalibrated = true;
          ws.send(JSON.stringify({ type: "calibration_done" }));
          broadcastToAll(session, { type: "calibrated" });
        } else if (msg.type === "start_live") {
          session.isLive = true;
          startTranscription(session);
          broadcastToAll(session, { type: "live_started" });
        } else if (msg.type === "stop_live") {
          session.isLive = false;
          stopTranscription(session);
          broadcastToAll(session, { type: "live_stopped" });
        }
      } else {
        // Binary audio data — forward to Deepgram
        if (session.isLive) {
          sendAudio(session, Buffer.from(data as ArrayBuffer));
        }
      }
    });

    ws.on("close", () => {
      session.listeners.delete(ws);
      console.log(`[WS] listener disconnected from session ${sessionId}`);
    });
  } else if (role === "reader") {
    session.readers.add(ws);

    // Send current state
    ws.send(
      JSON.stringify({
        type: "sync",
        transcript: session.transcript,
        answers: session.answers,
        isLive: session.isLive,
        isCalibrated: session.isCalibrated,
      })
    );

    ws.on("close", () => {
      session.readers.delete(ws);
      console.log(`[WS] reader disconnected from session ${sessionId}`);
    });
  }
});

const PORT = parseInt(process.env.PORT || "3001");
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
