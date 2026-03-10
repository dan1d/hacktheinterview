import OpenAI from "openai";
import type { Session } from "./sessions.js";
import { broadcastToReaders } from "./sessions.js";

let client: OpenAI;
function getClient() {
  if (!client) {
    client = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY!,
    });
  }
  return client;
}

export function buildSystemPrompt(session: Session): string {
  let prompt = `You are an expert interview coach. The user is in a live ${session.interviewType} interview right now.

Your job: when you see an interviewer's question, provide a clear, concise, expert-level answer that the user can reference.

Rules:
- Be direct and concise — the user needs to read fast
- Format with bullet points when listing multiple things
- For coding questions, include code snippets
- Sound natural, not robotic — the user will paraphrase your answers
- If it's a follow-up, reference the conversation context`;

  if (session.customPrompt) {
    prompt += `\n\nAdditional context from user:\n${session.customPrompt}`;
  }

  if (session.resumeText) {
    prompt += `\n\nUser's resume/background:\n${session.resumeText}`;
  }

  return prompt;
}

export async function generateAnswer(session: Session, question: string) {
  const systemPrompt = buildSystemPrompt(session);

  // Build conversation context from recent transcript
  const recentContext = session.transcript.slice(-10).join("\n");

  try {
    broadcastToReaders(session, {
      type: "answer_start",
      question,
    });

    const stream = await getClient().chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Recent conversation context:\n${recentContext}\n\nLatest interviewer question/statement:\n"${question}"\n\nProvide a suggested answer:`,
        },
      ],
      stream: true,
      max_tokens: 1024,
    });

    let fullAnswer = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullAnswer += content;
        broadcastToReaders(session, {
          type: "answer_chunk",
          content,
        });
      }
    }

    session.answers.push(fullAnswer);
    broadcastToReaders(session, {
      type: "answer_done",
      fullAnswer,
    });
  } catch (err) {
    console.error("[LLM] Error:", err);
    broadcastToReaders(session, {
      type: "answer_error",
      error: "Failed to generate answer",
    });
  }
}
