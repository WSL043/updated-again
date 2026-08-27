import { sha256 } from "./lib.mjs";

export const COMMUNITY_KINDS = new Set([
  "theme",
  "message",
  "collectible",
  "ritual",
  "companion",
  "constellation",
  "button-personality",
]);

export function cleanText(value, maximum, fallback = "") {
  const cleaned = String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || fallback).slice(0, maximum);
}

export function extractIssueFields(body) {
  const sections = new Map();
  for (const chunk of String(body ?? "").split(/^###\s+/m).slice(1)) {
    const newline = chunk.search(/\r?\n/);
    if (newline < 0) continue;
    sections.set(cleanText(chunk.slice(0, newline), 80), cleanText(chunk.slice(newline), 1200));
  }
  return {
    reason: sections.get("为什么今天要更新?") ?? "",
    change: sections.get("它会真正改变什么?") ?? "",
    kind: sections.get("最接近的类型") ?? "message",
    rollback: sections.get("用户后悔时怎么恢复?") ?? "恢复上一张本地快照。",
  };
}

export function normalizeCommunityIdea(issue) {
  const fields = extractIssueFields(issue.body);
  const requestedKind = cleanText(fields.kind, 40, "message");
  const kind = COMMUNITY_KINDS.has(requestedKind) ? requestedKind : "message";
  const number = Number(issue.number);
  if (!Number.isInteger(number) || number < 1) throw new Error("Community issue number must be a positive integer.");
  return {
    number,
    author: cleanText(issue.user?.login, 80, "anonymous"),
    headline: cleanText(issue.title, 90, `社区第 ${number} 号更新`).replace(/^\[update idea\]\s*/i, ""),
    reason: cleanText(fields.reason, 280, "社区觉得今天应该再更新一次。"),
    change: cleanText(fields.change, 280, "向公共版本票账写入一条社区提案。"),
    rollback: cleanText(fields.rollback, 180, "恢复上一张本地快照。"),
    kind,
    requestedKind,
  };
}

export function communityPayload(idea, sequence, date) {
  const seed = sha256(`${idea.number}:${idea.author}:${idea.headline}:${idea.change}`);
  const byte = (offset) => Number.parseInt(seed.slice(offset, offset + 2), 16);
  switch (idea.kind) {
    case "theme": {
      const palettes = [
        ["#16132d", "#292044", "#ffd166", "#c084fc"],
        ["#0d1b2a", "#18334a", "#86f7d2", "#4dd6ff"],
        ["#20151f", "#3a2438", "#ffb86b", "#ff6f91"],
      ];
      const [background, surface, accent, glow] = palettes[byte(0) % palettes.length];
      return { background, surface, accent, glow, banner: idea.reason };
    }
    case "collectible":
      return { id: `community-${idea.number}-${sequence}`, name: idea.headline, glyph: "※", note: idea.change };
    case "ritual":
      return { instruction: idea.change, reward: `完成证明：${idea.rollback}` };
    case "companion":
      return { name: `社区值班员 @${idea.author}`, mood: idea.reason, phrase: idea.change, glyph: "◉" };
    case "constellation":
      return { x: 5 + (byte(2) % 91), y: 8 + (byte(4) % 79), size: 4 + (byte(6) % 8), label: `${date} / ${idea.headline}` };
    case "button-personality": {
      const temperaments = ["calm", "shy", "dramatic", "bouncy"];
      return { label: idea.headline.slice(0, 42), temperament: temperaments[byte(8) % temperaments.length] };
    }
    default:
      return { text: `${idea.headline}：${idea.reason}` };
  }
}
