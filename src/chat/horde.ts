import type { ChatTurn } from "./types";

const HORDE_API = "https://aihorde.net/api/v2";
const ANONYMOUS_KEY = "0000000000";
const CLIENT_AGENT = "updated-again:0.1.2:https://github.com/WSL043/updated-again";

interface HordeGeneration {
  text?: string;
  model?: string;
  state?: string;
}

interface HordeStatus {
  done?: boolean;
  faulted?: boolean;
  generations?: HordeGeneration[];
}

interface HordeOptions {
  fetcher?: typeof fetch;
  pollMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
}

export interface HordeReply {
  content: string;
  model: string;
}

function compactText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 800);
}

export function buildHordePrompt(turns: ChatTurn[], context: string): string {
  const recent = turns.slice(-6).map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${compactText(turn.content)}`);
  const last = turns.at(-1)?.content ?? "";
  const language = /\p{Script=Han}/u.test(last) ? "Chinese" : "the user's language";
  return [
    `System: You are the chat character on Updated Again. Reply briefly and naturally in ${language}.`,
    "The project publishes at least one real change every day. Reasons may be absurd, but changes are real and recoverable.",
    "Do not claim to change the repository or know facts the user did not provide.",
    `Public project status: ${compactText(context)}`,
    "",
    ...recent,
    "Assistant:",
  ].join("\n");
}

function cleanReply(value: string): string {
  const cleaned = value
    .replace(/^\s*(?:Assistant|助手|机器人)\s*:\s*/iu, "")
    .replace(/\[Start a new conversation\][\s\S]*$/iu, "")
    .trim()
    .slice(0, 1_200);
  if (cleaned.length < 4) throw new Error("匿名云端的回答不可用。");
  return cleaned;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `匿名云端请求失败（${response.status}）。`;
    try {
      const data = await response.json() as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function askHorde(turns: ChatTurn[], context: string, options: HordeOptions = {}): Promise<HordeReply> {
  const fetcher = options.fetcher ?? fetch;
  const pollMs = options.pollMs ?? 1_250;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds)));
  const timeoutMs = options.timeoutMs ?? 18_000;
  const headers = {
    apikey: ANONYMOUS_KEY,
    "Client-Agent": CLIENT_AGENT,
    "Content-Type": "application/json",
  };
  const submitted = await readJson<{ id?: string }>(await fetcher(`${HORDE_API}/generate/text/async`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt: buildHordePrompt(turns, context),
      params: {
        max_length: 180,
        max_context_length: 2_048,
        temperature: 0.72,
        top_p: 0.9,
        rep_pen: 1.08,
        stop_sequence: ["\nUser:", "\nSystem:", "[Start a new conversation]"],
      },
      nsfw: false,
      censor_nsfw: true,
      slow_workers: true,
    }),
  }));
  if (!submitted.id) throw new Error("匿名云端没有创建任务。");

  const deadline = Date.now() + timeoutMs;
  let completed = false;
  try {
    while (Date.now() < deadline) {
      await sleep(pollMs);
      const status = await readJson<HordeStatus>(await fetcher(`${HORDE_API}/generate/text/status/${submitted.id}`));
      if (status.faulted) throw new Error("匿名云端任务失败。");
      if (!status.done) continue;
      const generation = status.generations?.find((item) => item.state === "ok" && item.text?.trim());
      if (!generation?.text) throw new Error("匿名云端没有可用回答。");
      completed = true;
      return { content: cleanReply(generation.text), model: generation.model ?? "community model" };
    }
    throw new Error("匿名云端排队太久。");
  } finally {
    if (!completed) {
      try {
        await fetcher(`${HORDE_API}/generate/text/status/${submitted.id}`, { method: "DELETE", headers });
      } catch {
        // Cancellation is best effort; the caller still falls back locally.
      }
    }
  }
}
