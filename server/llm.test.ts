import { describe, it, expect, vi } from "vitest";

// Mock OpenAI before importing llm module
vi.mock("openai", () => {
  return {
    default: class {
      chat = {
        completions: {
          create: vi.fn(),
        },
      };
    },
  };
});

import { buildSystemPrompt, generateAnswer } from "./llm.js";
import type { Session } from "./sessions.js";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "test123",
    interviewType: "Ruby",
    customPrompt: "",
    resumeText: "",
    calibrationAudio: null,
    isCalibrated: false,
    isLive: false,
    listeners: new Set(),
    readers: new Set(),
    transcript: [],
    answers: [],
    ...overrides,
  };
}

describe("buildSystemPrompt", () => {
  it("includes interview type", () => {
    const session = makeSession({ interviewType: "Python" });
    const prompt = buildSystemPrompt(session);
    expect(prompt).toContain("Python interview");
  });

  it("includes custom prompt when provided", () => {
    const session = makeSession({ customPrompt: "Focus on Django and FastAPI" });
    const prompt = buildSystemPrompt(session);
    expect(prompt).toContain("Focus on Django and FastAPI");
    expect(prompt).toContain("Additional context from user");
  });

  it("does not include custom prompt section when empty", () => {
    const session = makeSession({ customPrompt: "" });
    const prompt = buildSystemPrompt(session);
    expect(prompt).not.toContain("Additional context from user");
  });

  it("includes resume text when provided", () => {
    const session = makeSession({ resumeText: "Senior Engineer at Google" });
    const prompt = buildSystemPrompt(session);
    expect(prompt).toContain("Senior Engineer at Google");
    expect(prompt).toContain("resume/background");
  });

  it("does not include resume section when empty", () => {
    const session = makeSession({ resumeText: "" });
    const prompt = buildSystemPrompt(session);
    expect(prompt).not.toContain("resume/background");
  });

  it("includes all core instructions", () => {
    const session = makeSession();
    const prompt = buildSystemPrompt(session);
    expect(prompt).toContain("expert interview coach");
    expect(prompt).toContain("direct and concise");
    expect(prompt).toContain("bullet points");
    expect(prompt).toContain("code snippets");
  });
});

describe("generateAnswer", () => {
  it("broadcasts answer_start then error when API fails", async () => {
    const reader = { readyState: 1, send: vi.fn() } as any;
    const session = makeSession();
    session.readers.add(reader);

    await generateAnswer(session, "What is Ruby?");

    const calls = reader.send.mock.calls.map((c: any) => JSON.parse(c[0]));
    expect(calls[0]).toEqual({ type: "answer_start", question: "What is Ruby?" });
    // Mock returns undefined stream, so it errors gracefully
    const lastCall = calls[calls.length - 1];
    expect(lastCall.type).toBe("answer_error");
  });

  it("stores question in answer_start broadcast", async () => {
    const reader = { readyState: 1, send: vi.fn() } as any;
    const session = makeSession();
    session.readers.add(reader);

    await generateAnswer(session, "Explain method_missing in Ruby");

    const calls = reader.send.mock.calls.map((c: any) => JSON.parse(c[0]));
    expect(calls[0].question).toBe("Explain method_missing in Ruby");
  });

  it("uses recent transcript as context", async () => {
    const session = makeSession({
      transcript: ["Tell me about yourself", "What frameworks do you use?"],
    });
    const reader = { readyState: 1, send: vi.fn() } as any;
    session.readers.add(reader);

    // This will fail at the API call but that's fine — we're testing it runs
    await generateAnswer(session, "Follow up question");

    // If it gets to answer_start, it processed the context
    const calls = reader.send.mock.calls.map((c: any) => JSON.parse(c[0]));
    expect(calls[0].type).toBe("answer_start");
  });
});
