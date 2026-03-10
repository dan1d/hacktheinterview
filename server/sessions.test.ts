import { describe, it, expect, vi } from "vitest";
import {
  createSession,
  getSession,
  broadcastToReaders,
  broadcastToAll,
} from "./sessions.js";

function mockWs(readyState = 1) {
  return { readyState, send: vi.fn() } as any;
}

describe("createSession", () => {
  it("creates a session with correct defaults", () => {
    const session = createSession({
      interviewType: "Ruby",
      customPrompt: "Expert level",
      resumeText: "10 years experience",
    });

    expect(session.id).toHaveLength(8);
    expect(session.interviewType).toBe("Ruby");
    expect(session.customPrompt).toBe("Expert level");
    expect(session.resumeText).toBe("10 years experience");
    expect(session.isCalibrated).toBe(false);
    expect(session.isLive).toBe(false);
    expect(session.calibrationAudio).toBeNull();
    expect(session.transcript).toEqual([]);
    expect(session.answers).toEqual([]);
    expect(session.listeners.size).toBe(0);
    expect(session.readers.size).toBe(0);
  });

  it("generates unique session IDs", () => {
    const s1 = createSession({ interviewType: "Go", customPrompt: "", resumeText: "" });
    const s2 = createSession({ interviewType: "Go", customPrompt: "", resumeText: "" });
    expect(s1.id).not.toBe(s2.id);
  });
});

describe("getSession", () => {
  it("returns a session by ID", () => {
    const session = createSession({ interviewType: "Python", customPrompt: "", resumeText: "" });
    const found = getSession(session.id);
    expect(found).toBe(session);
  });

  it("returns undefined for unknown ID", () => {
    expect(getSession("nonexistent")).toBeUndefined();
  });
});

describe("broadcastToReaders", () => {
  it("sends JSON to all readers with readyState OPEN", () => {
    const session = createSession({ interviewType: "JS", customPrompt: "", resumeText: "" });
    const ws1 = mockWs(1);
    const ws2 = mockWs(1);
    const ws3 = mockWs(3); // CLOSED
    session.readers.add(ws1);
    session.readers.add(ws2);
    session.readers.add(ws3);

    broadcastToReaders(session, { type: "test", value: 42 });

    expect(ws1.send).toHaveBeenCalledWith(JSON.stringify({ type: "test", value: 42 }));
    expect(ws2.send).toHaveBeenCalledWith(JSON.stringify({ type: "test", value: 42 }));
    expect(ws3.send).not.toHaveBeenCalled();
  });

  it("does not send to listeners", () => {
    const session = createSession({ interviewType: "JS", customPrompt: "", resumeText: "" });
    const listener = mockWs(1);
    const reader = mockWs(1);
    session.listeners.add(listener);
    session.readers.add(reader);

    broadcastToReaders(session, { type: "msg" });

    expect(reader.send).toHaveBeenCalled();
    expect(listener.send).not.toHaveBeenCalled();
  });
});

describe("broadcastToAll", () => {
  it("sends to both readers and listeners", () => {
    const session = createSession({ interviewType: "JS", customPrompt: "", resumeText: "" });
    const listener = mockWs(1);
    const reader = mockWs(1);
    session.listeners.add(listener);
    session.readers.add(reader);

    broadcastToAll(session, { type: "calibrated" });

    const expected = JSON.stringify({ type: "calibrated" });
    expect(reader.send).toHaveBeenCalledWith(expected);
    expect(listener.send).toHaveBeenCalledWith(expected);
  });
});
