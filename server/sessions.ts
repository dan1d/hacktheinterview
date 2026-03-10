import { v4 as uuid } from "uuid";
import type { WebSocket } from "ws";

export interface Session {
  id: string;
  interviewType: string;
  customPrompt: string;
  resumeText: string;
  calibrationAudio: Float32Array | null;
  isCalibrated: boolean;
  isLive: boolean;
  listeners: Set<WebSocket>; // mic-streaming clients
  readers: Set<WebSocket>;  // display clients
  transcript: string[];
  answers: string[];
}

const sessions = new Map<string, Session>();

export function createSession(opts: {
  interviewType: string;
  customPrompt: string;
  resumeText: string;
}): Session {
  const id = uuid().slice(0, 8);
  const session: Session = {
    id,
    interviewType: opts.interviewType,
    customPrompt: opts.customPrompt,
    resumeText: opts.resumeText,
    calibrationAudio: null,
    isCalibrated: false,
    isLive: false,
    listeners: new Set(),
    readers: new Set(),
    transcript: [],
    answers: [],
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function broadcastToReaders(session: Session, data: object) {
  const msg = JSON.stringify(data);
  for (const ws of session.readers) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

export function broadcastToAll(session: Session, data: object) {
  const msg = JSON.stringify(data);
  for (const ws of [...session.readers, ...session.listeners]) {
    if (ws.readyState === 1) ws.send(msg);
  }
}
