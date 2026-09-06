/** Local play only: recipes never install capsules or mutate the signed world. */
import type { FeedEntry, UpdateKind } from "./types";

export const MATERIALS: Record<UpdateKind, { label: string; glyph: string }> = {
  theme: { label: "颜色", glyph: "◐" },
  message: { label: "一句话", glyph: "…" },
  collectible: { label: "藏品", glyph: "◇" },
  ritual: { label: "仪式", glyph: "↻" },
  companion: { label: "团子", glyph: "◉" },
  constellation: { label: "星星", glyph: "✦" },
  "button-personality": { label: "按钮", glyph: "▣" },
};
export const MATERIAL_KINDS = Object.keys(MATERIALS) as UpdateKind[];
export const METHODS = [
  { id: "shake", label: "摇一摇", prefix: "晃晃悠悠的", note: "它决定先晃三下，再假装什么都没发生。" },
  { id: "rest", label: "晾一晾", prefix: "正在午睡的", note: "它把所有紧急事项都挪到了下一个晴天。" },
  { id: "fold", label: "叠一叠", prefix: "口袋版", note: "它把自己折小了一点，刚好能装进一个念头。" },
] as const;
export type Method = (typeof METHODS)[number]["id"];

type Family = { a: UpdateKind; b: UpdateKind; name: string; glyph: string; note: string; clue: string };
// Stable order and IDs are part of the notebook format. Append; do not reorder.
export const FAMILIES: readonly Family[] = [
  { a: "theme", b: "theme", name: "双倍晴天", glyph: "☀", note: "两种颜色达成一致：今天不需要灰心。", clue: "让两份颜色互相晒晒。" },
  { a: "theme", b: "message", name: "会脸红的标点", glyph: "!", note: "一句话第一次知道，表达还可以有颜色。", clue: "给一句话涂上颜色。" },
  { a: "theme", b: "collectible", name: "日落罐头", glyph: "◒", note: "保质期写着：直到你再次想起它。", clue: "把颜色装进一件藏品。" },
  { a: "theme", b: "ritual", name: "彩虹洗衣日", glyph: "≋", note: "把今天漂洗一遍，留下不必解释的颜色。", clue: "让颜色参加一次仪式。" },
  { a: "theme", b: "companion", name: "变色团子", glyph: "◕", note: "它不是害羞，只是正在加载一种新心情。", clue: "给团子借一点颜色。" },
  { a: "theme", b: "constellation", name: "极光便签", glyph: "✧", note: "天上贴着一张小纸条：记得抬头。", clue: "让颜色碰到一颗星星。" },
  { a: "theme", b: "button-personality", name: "黄昏开关", glyph: "◐", note: "按下去以后，所有事情都显得没那么着急。", clue: "把颜色交给一个按钮。" },
  { a: "message", b: "message", name: "回声三明治", glyph: "≡", note: "两句话夹住了一小片沉默。", clue: "让两句话互相接话。" },
  { a: "message", b: "collectible", name: "有话要说的石头", glyph: "◆", note: "它憋了很久，最后只说了一声：嗯。", clue: "让藏品听见一句话。" },
  { a: "message", b: "ritual", name: "废话咒语", glyph: "〰", note: "念完不会变强，但会少一点无聊。", clue: "在仪式里念一句话。" },
  { a: "message", b: "companion", name: "团子广播站", glyph: "◉", note: "本台今日消息：你来过，这件事很重要。", clue: "把一句话交给团子。" },
  { a: "message", b: "constellation", name: "宇宙短信", glyph: "✉", note: "已发送。对方正在光年以外输入……", clue: "对星星说一句话。" },
  { a: "message", b: "button-personality", name: "嘴硬开关", glyph: "▣", note: "它说别按，说明书却写着欢迎光临。", clue: "让按钮学会说话。" },
  { a: "collectible", b: "collectible", name: "袖珍博物馆", glyph: "▤", note: "馆藏两件，馆长暂时由你兼任。", clue: "让两件藏品住在一起。" },
  { a: "collectible", b: "ritual", name: "幸运收据", glyph: "▥", note: "付款金额：一次认真做完的小事。", clue: "带着藏品完成一个仪式。" },
  { a: "collectible", b: "companion", name: "团子的行李箱", glyph: "▧", note: "里面只有一件东西：想和你出去走走。", clue: "让团子保管一件藏品。" },
  { a: "collectible", b: "constellation", name: "陨石糖", glyph: "✶", note: "来自很远的地方，但甜度刚刚好。", clue: "让藏品接住一颗星星。" },
  { a: "collectible", b: "button-personality", name: "不营业售货机", glyph: "▦", note: "不收硬币，只接受好奇。", clue: "给藏品接上一个按钮。" },
  { a: "ritual", b: "ritual", name: "周末预演", glyph: "↺", note: "先练习放松，正式放松的日期另行通知。", clue: "让两个仪式互相排练。" },
  { a: "ritual", b: "companion", name: "团子散步许可证", glyph: "◎", note: "目的地不限，发呆也算里程。", clue: "邀请团子参加仪式。" },
  { a: "ritual", b: "constellation", name: "流星排练", glyph: "☄", note: "愿望还没想好也没关系，它会再来。", clue: "请星星排练一次仪式。" },
  { a: "ritual", b: "button-personality", name: "郑重其事的没事", glyph: "↻", note: "流程完整，成果为零，心情不错。", clue: "用按钮启动一个仪式。" },
  { a: "companion", b: "companion", name: "团子圆桌会议", glyph: "◌", note: "议题只有一个：下一顿吃什么。", clue: "让团子见到自己的副本。" },
  { a: "companion", b: "constellation", name: "宇航团子", glyph: "✺", note: "没有离开你，只是站得高了一点。", clue: "让团子靠近星星。" },
  { a: "companion", b: "button-personality", name: "怕痒遥控器", glyph: "⊙", note: "你控制方向，它负责笑场。", clue: "把一个按钮递给团子。" },
  { a: "constellation", b: "constellation", name: "迷你银河", glyph: "✴", note: "宇宙很大，这一小块归你看管。", clue: "让两颗星星互相认路。" },
  { a: "constellation", b: "button-personality", name: "月亮门铃", glyph: "☾", note: "请轻按，月亮可能已经睡了。", clue: "在星星旁装一个按钮。" },
  { a: "button-personality", b: "button-personality", name: "互相推辞的开关", glyph: "⇄", note: "你先请。不不，你先请。系统因此十分礼貌。", clue: "让两个按钮商量谁先动。" },
];

export interface Experiment {
  id: string;
  family: number;
  a: UpdateKind;
  b: UpdateKind;
  method: Method;
  name: string;
  glyph: string;
  note: string;
  clue: string;
}
export const EXPERIMENTS: readonly Experiment[] = FAMILIES.flatMap((family, index) => METHODS.map((method) => ({
  id: `${family.a}+${family.b}:${method.id}`,
  family: index,
  a: family.a,
  b: family.b,
  method: method.id,
  name: `${method.prefix}${family.name}`,
  glyph: family.glyph,
  note: `${family.note}${method.note}`,
  clue: family.clue,
})));
export const EXPERIMENT_BY_ID = new Map(EXPERIMENTS.map((recipe) => [recipe.id, recipe]));

export function mix(a: UpdateKind, b: UpdateKind, method: Method): Experiment {
  const recipe = EXPERIMENTS.find((candidate) => candidate.method === method &&
    ((candidate.a === a && candidate.b === b) || (candidate.a === b && candidate.b === a)));
  if (!recipe) throw new Error("这个组合还没有安全的实验配方。");
  return recipe;
}

const DAY_MS = 86_400_000;
const SHANGHAI_OFFSET = 8 * 60 * 60 * 1000;
export function projectDay(now: Date = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new Error("日期无效。");
  return new Date(now.getTime() + SHANGHAI_OFFSET).toISOString().slice(0, 10);
}
export function dailyExperiment(day: string): Experiment {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("日期无效。");
  const stamp = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== day) throw new Error("日期无效。");
  // An 84-day cycle without repeats. Frozen v1 pool keeps future additions from changing today's clue.
  const pool = EXPERIMENTS.slice(0, 84);
  const index = ((Math.floor(stamp / DAY_MS) * 31) % pool.length + pool.length) % pool.length;
  return pool[index];
}

export interface Material { kind: UpdateKind; id: string; headline: string }
export function validMaterial(value: unknown): value is Material {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.kind === "string" && MATERIAL_KINDS.includes(item.kind as UpdateKind) &&
    typeof item.id === "string" && item.id.length > 0 && item.id.length <= 200 &&
    typeof item.headline === "string" && item.headline.length <= 300;
}
/** Cache is just a label cache; it can NEVER grant ownership after rollback. */
export function availableMaterials(entries: readonly FeedEntry[], installedIds: readonly string[], cached: readonly Material[] = []): Material[] {
  const installed = new Set(installedIds);
  const byKind = new Map<UpdateKind, Material>();
  for (const item of cached) if (validMaterial(item) && installed.has(item.id)) byKind.set(item.kind, item);
  const seen = new Set<UpdateKind>();
  for (const entry of entries) {
    if (!installed.has(entry.id) || seen.has(entry.kind)) continue;
    const item = { kind: entry.kind, id: entry.id, headline: entry.headline.slice(0, 300) };
    if (validMaterial(item)) { byKind.set(item.kind, item); seen.add(item.kind); }
  }
  return MATERIAL_KINDS.flatMap((kind) => byKind.has(kind) ? [byKind.get(kind)!] : []);
}
