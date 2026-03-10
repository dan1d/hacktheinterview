import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external deps before imports
vi.mock("@deepgram/sdk", () => ({
  createClient: () => ({ listen: { live: vi.fn() } }),
  LiveTranscriptionEvents: {
    Open: "open",
    Transcript: "transcript",
    UtteranceEnd: "utteranceEnd",
    Error: "error",
    Close: "close",
  },
}));
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: vi.fn() } };
  },
}));
vi.mock("pdf-parse", () => ({
  default: vi.fn().mockResolvedValue({ text: "Parsed resume content" }),
}));

import { Hono } from "hono";
import { createSession, getSession } from "./sessions.js";

// Build a minimal app with just the API routes for testing
const app = new Hono();

app.post("/api/session", async (c) => {
  const formData = await c.req.formData();
  const interviewType = (formData.get("interviewType") as string) || "general";
  const customPrompt = (formData.get("customPrompt") as string) || "";
  const session = createSession({ interviewType, customPrompt, resumeText: "" });
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

describe("POST /api/session", () => {
  it("creates a session and returns sessionId", async () => {
    const form = new FormData();
    form.append("interviewType", "Ruby");
    form.append("customPrompt", "Expert level");

    const res = await app.request("/api/session", {
      method: "POST",
      body: form,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBeDefined();
    expect(body.sessionId).toHaveLength(8);
  });

  it("defaults interviewType to general", async () => {
    const form = new FormData();
    const res = await app.request("/api/session", { method: "POST", body: form });
    const body = await res.json();

    const session = getSession(body.sessionId);
    expect(session?.interviewType).toBe("general");
  });
});

describe("GET /api/session/:id", () => {
  it("returns session data", async () => {
    const session = createSession({
      interviewType: "Go",
      customPrompt: "Concurrency questions",
      resumeText: "",
    });

    const res = await app.request(`/api/session/${session.id}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.id).toBe(session.id);
    expect(body.interviewType).toBe("Go");
    expect(body.isCalibrated).toBe(false);
    expect(body.isLive).toBe(false);
    expect(body.transcript).toEqual([]);
    expect(body.answers).toEqual([]);
  });

  it("returns 404 for unknown session", async () => {
    const res = await app.request("/api/session/unknown");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Session not found");
  });
});
