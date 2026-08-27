import type { ChatTurn } from "./types";

export interface PuterUsage {
  allowance: number;
  remaining: number;
}

interface PuterResponse {
  message?: { content?: string | Array<{ type?: string; text?: string }> };
  toString?: () => string;
}

interface PuterGlobal {
  ai: {
    chat: (messages: Array<{ role: string; content: string }>) => Promise<PuterResponse>;
  };
  auth: {
    isSignedIn: () => boolean;
    signIn: () => Promise<unknown>;
    getMonthlyUsage: () => Promise<{
      allowanceInfo?: { monthUsageAllowance?: number; remaining?: number };
    }>;
  };
}

declare global {
  interface Window {
    puter?: PuterGlobal;
  }
}

const PUTER_SCRIPT_ID = "updated-again-puter";
const PUTER_SCRIPT = "https://js.puter.com/v2/";
const SYSTEM_PROMPT = `你在 Updated Again 的版本聊天室回答问题。项目每天至少发布一次真实变化，更新理由允许荒唐，所有版本都会保留。
回答简短、自然、具体。不要写宣言，不要堆比喻，不要声称能修改仓库、发布版本或知道用户未提供的信息。默认使用用户的语言。`;

function loadPuter(): Promise<PuterGlobal> {
  if (window.puter) return Promise.resolve(window.puter);
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(PUTER_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const timer = window.setTimeout(() => reject(new Error("Puter 加载超时。")), 10_000);
    const finish = () => {
      window.clearTimeout(timer);
      if (window.puter) resolve(window.puter);
      else reject(new Error("Puter 已加载，但没有提供可用接口。"));
    };
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => {
      window.clearTimeout(timer);
      reject(new Error("无法连接 Puter。"));
    }, { once: true });
    if (!existing) {
      script.id = PUTER_SCRIPT_ID;
      script.src = PUTER_SCRIPT;
      script.async = true;
      document.head.append(script);
    }
  });
}

export function extractPuterText(response: PuterResponse): string {
  const content = response.message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const text = content.map((part) => part.text ?? "").join("").trim();
    if (text) return text;
  }
  const fallback = response.toString?.();
  if (fallback && fallback !== "[object Object]") return fallback;
  throw new Error("Puter 没有返回文本。");
}

async function readUsage(puter: PuterGlobal): Promise<PuterUsage | null> {
  try {
    const result = await puter.auth.getMonthlyUsage();
    const allowance = result.allowanceInfo?.monthUsageAllowance;
    const remaining = result.allowanceInfo?.remaining;
    if (typeof allowance !== "number" || typeof remaining !== "number") return null;
    return { allowance, remaining };
  } catch {
    return null;
  }
}

export async function connectPuter(): Promise<PuterUsage | null> {
  const puter = await loadPuter();
  if (!puter.auth.isSignedIn()) await puter.auth.signIn();
  return readUsage(puter);
}

export async function askPuter(turns: ChatTurn[], context: string): Promise<{ content: string; usage: PuterUsage | null }> {
  const puter = await loadPuter();
  if (!puter.auth.isSignedIn()) throw new Error("请先连接 Puter 账户。");
  const compact = turns.slice(-8).map((turn) => ({
    role: turn.role,
    content: turn.content.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 800),
  }));
  const response = await puter.ai.chat([
    { role: "system", content: `${SYSTEM_PROMPT}\n当前公开状态：${context}` },
    ...compact,
  ]);
  return { content: extractPuterText(response), usage: await readUsage(puter) };
}

export function usagePercent(usage: PuterUsage | null): number | null {
  if (!usage || usage.allowance <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((usage.remaining / usage.allowance) * 100)));
}
