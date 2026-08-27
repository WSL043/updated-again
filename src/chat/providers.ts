export type GhostProvider = "puter" | "chrome" | "local";

export interface GhostTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GhostReply {
  content: string;
  provider: GhostProvider;
  attempted: GhostProvider[];
}

interface PuterResponse {
  message?: { content?: string | Array<{ type?: string; text?: string }> };
  toString?: () => string;
}

interface PuterGlobal {
  ai: {
    chat: (messages: Array<{ role: string; content: string }>, options?: Record<string, unknown>) => Promise<PuterResponse>;
  };
}

interface LanguageModelSession {
  prompt: (input: string) => Promise<string>;
  destroy?: () => void;
}

interface LanguageModelGlobal {
  availability: () => Promise<string>;
  create: (options?: Record<string, unknown>) => Promise<LanguageModelSession>;
}

declare global {
  interface Window {
    puter?: PuterGlobal;
    LanguageModel?: LanguageModelGlobal;
  }
}

const PUTER_SCRIPT_ID = "updated-again-puter";
const PUTER_SCRIPT = "https://js.puter.com/v2/";
const SYSTEM_PROMPT = `你是 Updated Again 里的“版本幽灵”。这是一个为了更新而更新、每天至少真实改变一点点的软件玩具。
回答应当简短、有点荒诞但仍然有帮助。可以围绕更新理由、玩法点子、版本历史和软件存在主义聊天。
不要假装你能修改仓库、发布版本或看到用户没有提供的信息。默认使用用户所用的语言回答。`;

function compactTurns(turns: GhostTurn[]): GhostTurn[] {
  return turns
    .slice(-8)
    .map((turn) => ({ ...turn, content: turn.content.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 800) }))
    .filter((turn) => turn.content.length > 0);
}

function loadPuter(): Promise<PuterGlobal> {
  if (window.puter) return Promise.resolve(window.puter);
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(PUTER_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const timer = window.setTimeout(() => reject(new Error("Puter.js load timed out")), 10_000);
    const finish = () => {
      window.clearTimeout(timer);
      if (window.puter) resolve(window.puter);
      else reject(new Error("Puter.js loaded without an API"));
    };
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => {
      window.clearTimeout(timer);
      reject(new Error("Puter.js failed to load"));
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
  throw new Error("Puter returned no text");
}

async function askPuter(turns: GhostTurn[], context: string): Promise<string> {
  const puter = await loadPuter();
  const response = await puter.ai.chat([
    { role: "system", content: `${SYSTEM_PROMPT}\n当前公开状态：${context}` },
    ...compactTurns(turns),
  ]);
  return extractPuterText(response);
}

async function askChrome(turns: GhostTurn[], context: string): Promise<string> {
  const api = window.LanguageModel;
  if (!api || await api.availability() === "unavailable") throw new Error("Chrome built-in AI unavailable");
  const history = compactTurns(turns);
  const latest = history.at(-1)?.content ?? "聊聊今天的更新。";
  const transcript = history.slice(0, -1).map((turn) => `${turn.role === "user" ? "USER" : "GHOST"}: ${turn.content}`).join("\n");
  const session = await api.create({
    initialPrompts: [{ role: "system", content: `${SYSTEM_PROMPT}\nCurrent public state: ${context}` }],
  });
  try {
    return (await session.prompt(`${transcript ? `${transcript}\n` : ""}USER: ${latest}\nGHOST:`)).trim();
  } finally {
    session.destroy?.();
  }
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function localGhostReply(prompt: string, context: string): string {
  const normalized = prompt.trim();
  if (/点子|想法|理由|idea|玩/i.test(normalized)) {
    const ideas = [
      "让下一更给昨天的更新写一封道歉信。",
      "做一次“反更新”：界面看似退后一步，账本却诚实地前进一步。",
      "让按钮根据连续更新天数逐渐长出官僚主义措辞。",
      "每逢质数版次，发布一件无法解释用途的数字藏品。",
    ];
    return `离线脑子从废纸篓里翻到一个点子：${ideas[hashText(normalized) % ideas.length]}`;
  }
  if (/更新|update|版本/i.test(normalized)) {
    return `我听见滚筒在响。${context}。如果没有宏大功能，就更新一个按钮的脾气——变化够小，历史照样算数。`;
  }
  if (/你好|hello|hi|在吗/i.test(normalized)) return "在。云端脑子可能请假了，但版本幽灵没有下班制度。你想聊更新，还是给下一更找个离谱理由？";
  const replies = [
    "这条消息没有成功寄到云端，于是我用本地规则认真胡说：可以继续问，我不会因为免费额度用完而消失。",
    "远处的模型没有回信。作为备用幽灵，我建议把这个沉默本身登记成一次服务状态更新。",
    "我现在是离线形态，知识不多，态度稳定。换个问法，或者问我要一个更新点子。",
  ];
  return replies[hashText(`${normalized}:${context}`) % replies.length];
}

export async function askVersionGhost(turns: GhostTurn[], context: string): Promise<GhostReply> {
  const attempted: GhostProvider[] = [];
  try {
    attempted.push("puter");
    return { content: await askPuter(turns, context), provider: "puter", attempted };
  } catch {
    try {
      attempted.push("chrome");
      return { content: await askChrome(turns, context), provider: "chrome", attempted };
    } catch {
      attempted.push("local");
      return {
        content: localGhostReply(turns.at(-1)?.content ?? "", context),
        provider: "local",
        attempted,
      };
    }
  }
}
