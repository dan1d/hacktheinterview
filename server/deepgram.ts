import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import type { Session } from "./sessions.js";
import { broadcastToReaders } from "./sessions.js";
import { generateAnswer } from "./llm.js";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

// Track active Deepgram connections per session
const activeConnections = new Map<string, any>();

export function startTranscription(session: Session) {
  if (activeConnections.has(session.id)) return activeConnections.get(session.id);

  const connection = deepgram.listen.live({
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

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log(`[Deepgram] Connected for session ${session.id}`);
  });

  let currentUtterance = "";

  connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    if (!transcript || transcript.trim() === "") return;

    const isFinal = data.is_final;
    const speaker = data.channel?.alternatives?.[0]?.words?.[0]?.speaker;

    // If calibrated, skip user's voice (speaker 0 after calibration = user)
    // This is a simplified approach; real diarization may need tuning
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
        // Generate AI answer for this question
        generateAnswer(session, fullUtterance);
      }
    } else {
      broadcastToReaders(session, {
        type: "transcript_interim",
        text: transcript,
      });
    }
  });

  connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
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

  connection.on(LiveTranscriptionEvents.Error, (err: any) => {
    console.error(`[Deepgram] Error for session ${session.id}:`, err);
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    console.log(`[Deepgram] Closed for session ${session.id}`);
    activeConnections.delete(session.id);
  });

  activeConnections.set(session.id, connection);
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
