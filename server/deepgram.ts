import { DeepgramClient } from "@deepgram/sdk";
import type { Session } from "./sessions.js";
import { broadcastToReaders } from "./sessions.js";
import { generateAnswer } from "./llm.js";

const deepgram = new DeepgramClient(process.env.DEEPGRAM_API_KEY!);

// Track active Deepgram connections per session
const activeConnections = new Map<string, any>();

export async function startTranscription(session: Session) {
  if (activeConnections.has(session.id)) return activeConnections.get(session.id);

  const connection = await deepgram.listen.v1.connect({
    model: "nova-2",
    language: "en",
    smart_format: true,
    interim_results: true,
    utterance_end_ms: 1500,
    vad_events: true,
    diarize: true,
    encoding: "linear16",
    sample_rate: 16000,
    channels: 1,
  });

  activeConnections.set(session.id, connection);

  let currentUtterance = "";

  connection.on("open", () => {
    console.log(`[Deepgram] Connected for session ${session.id}`);
  });

  connection.on("transcript", (data: any) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    if (!transcript || transcript.trim() === "") return;

    const isFinal = data.is_final;
    const speaker = data.channel?.alternatives?.[0]?.words?.[0]?.speaker;

    // If calibrated, skip user's voice (speaker 0 after calibration = user)
    if (session.isCalibrated && speaker === 0) return;

    if (isFinal) {
      currentUtterance += " " + transcript;
      const fullUtterance = currentUtterance.trim();
      currentUtterance = "";

      if (fullUtterance) {
        session.transcript.push(fullUtterance);
        broadcastToReaders(session, {
          type: "transcript_final",
          text: fullUtterance,
        });
        generateAnswer(session, fullUtterance);
      }
    } else {
      broadcastToReaders(session, {
        type: "transcript_interim",
        text: transcript,
      });
    }
  });

  connection.on("utterance_end", () => {
    if (currentUtterance.trim()) {
      session.transcript.push(currentUtterance.trim());
      broadcastToReaders(session, {
        type: "transcript_final",
        text: currentUtterance.trim(),
      });
      generateAnswer(session, currentUtterance.trim());
      currentUtterance = "";
    }
  });

  connection.on("error", (err: any) => {
    console.error(`[Deepgram] Error for session ${session.id}:`, err);
  });

  connection.on("close", () => {
    console.log(`[Deepgram] Closed for session ${session.id}`);
    activeConnections.delete(session.id);
  });

  return connection;
}

export function sendAudio(session: Session, audioData: Buffer) {
  const conn = activeConnections.get(session.id);
  if (conn) {
    conn.send(audioData);
  }
}

export function stopTranscription(session: Session) {
  const conn = activeConnections.get(session.id);
  if (conn) {
    conn.finish();
    activeConnections.delete(session.id);
  }
}
