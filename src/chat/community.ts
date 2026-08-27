export const COMMUNITY_PAIR_COUNT = 410_009;

type DialogPair = [prompt: string, reply: string];
export type CorpusShard = "zh" | "en" | "de" | "it" | "other";

interface CommunityCorpus {
  version: number;
  shard: CorpusShard;
  sources: string[];
  pairs: DialogPair[];
}

interface CommunityManifest {
  version: number;
  totalPairs: number;
  shards: Record<CorpusShard, { path: string; pairCount: number }>;
}

interface PreparedCorpus {
  exact: Map<string, string[]>;
  pairs: Array<[normalizedPrompt: string, reply: string]>;
  postings: Map<string, number[]>;
}

const corpusPromises = new Map<CorpusShard, Promise<PreparedCorpus>>();
let manifestPromise: Promise<CommunityManifest> | undefined;

export function normalizePrompt(value: string): string {
  let normalized = value.toLocaleLowerCase("zh-CN").replace(/[^\p{L}\p{N}]+/gu, "");
  normalized = normalized
    .replace(/^(请问|我想问(?:一下)?)/u, "")
    .replace(/(喜不喜欢|爱不爱|喜歡不喜歡|愛不愛)/gu, "爱")
    .replace(/(喜欢|喜爱|喜歡|喜愛|爱着|愛著)/gu, "爱")
    .replace(/(为啥|为何)/gu, "为什么")
    .replace(/(為啥|為何)/gu, "為什麼")
    .replace(/(咋样|怎么样)/gu, "如何")
    .replace(/(咋樣|怎麼樣)/gu, "如何")
    .replace(/哪儿/gu, "哪里")
    .replace(/哪兒/gu, "哪裡")
    .replace(/每天都要/gu, "每天")
    .replace(/每天都得/gu, "每天")
    .replace(/[吗嘛么呢呀啊]$/u, "")
    .replace(/[嗎嘛麼呢呀啊]$/u, "")
    .replace(/^whats/u, "whatis")
    .replace(/^hows/u, "howis");
  return normalized;
}

export function detectCorpusShard(value: string): CorpusShard {
  const lower = value.toLocaleLowerCase();
  if (/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Thai}\p{Script=Devanagari}]/u.test(lower)) return "other";
  if (/\p{Script=Han}/u.test(lower)) return "zh";
  if (/[äöüß]/u.test(lower) || /\b(?:ich|nicht|danke|bitte|warum|hallo|wie geht)\b/u.test(lower)) return "de";
  if (/\b(?:ciao|grazie|perché|come stai|buongiorno|buonasera|sono|vorrei)\b/u.test(lower)) return "it";
  if (/[ñ¿¡ãõçğşåøæ]/u.test(lower) || /\b(?:bonjour|merci|hola|gracias|olá|obrigado|goedendag|hej|merhaba)\b/u.test(lower)) return "other";
  return "en";
}

function bigrams(value: string): string[] {
  if (value.length < 2) return value ? [value] : [];
  const result = new Set<string>();
  for (let index = 0; index < value.length - 1; index += 1) result.add(value.slice(index, index + 2));
  return [...result];
}

function similarity(left: string[], rightValue: string): number {
  const right = new Set(bigrams(rightValue));
  if (!left.length || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return (2 * overlap) / (left.length + right.size);
}

export function findCommunityReply(corpus: PreparedCorpus, prompt: string): string | null {
  const normalized = normalizePrompt(prompt);
  if (!normalized) return null;
  const exact = corpus.exact.get(normalized);
  if (exact?.length) return exact[normalized.length % exact.length];
  if (normalized.length < 3) return null;

  const query = bigrams(normalized);
  const lists = query
    .map((token) => corpus.postings.get(token) ?? [])
    .filter((list) => list.length)
    .sort((left, right) => left.length - right.length);
  if (!lists.length) return null;

  const usefulLists = lists.filter((list) => list.length <= 20_000).slice(0, 6);
  const selectedLists = usefulLists.length ? usefulLists : lists.slice(0, 2);
  const candidateHits = new Map<number, number>();
  for (const list of selectedLists) {
    for (const index of list) candidateHits.set(index, (candidateHits.get(index) ?? 0) + 1);
  }
  const candidates = [...candidateHits].sort((left, right) => right[1] - left[1]).slice(0, 2_000);

  let bestReply: string | null = null;
  let bestScore = 0;
  for (const [index] of candidates) {
    const [candidate, reply] = corpus.pairs[index];
    if (Math.abs(candidate.length - normalized.length) > Math.max(8, normalized.length)) continue;
    const score = similarity(query, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestReply = reply;
    }
  }
  return bestScore >= 0.72 ? bestReply : null;
}

async function decodeCorpus(response: Response): Promise<CommunityCorpus> {
  if (!response.ok) throw new Error(`社区语料加载失败（${response.status}）。`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
  const stream = isGzip
    ? new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")))
    : new Response(bytes);
  return JSON.parse(await stream.text()) as CommunityCorpus;
}

function prepareCorpus(data: CommunityCorpus): PreparedCorpus {
  if (![1, 2].includes(data.version) || !Array.isArray(data.pairs)) throw new Error("社区语料格式不受支持。");
  const exact = new Map<string, string[]>();
  const pairs: PreparedCorpus["pairs"] = [];
  const postings = new Map<string, number[]>();
  for (const [prompt, reply] of data.pairs) {
    if (typeof prompt !== "string" || typeof reply !== "string") continue;
    const normalized = normalizePrompt(prompt);
    if (!normalized) continue;
    const index = pairs.length;
    pairs.push([normalized, reply]);
    for (const token of bigrams(normalized)) {
      const list = postings.get(token) ?? [];
      list.push(index);
      postings.set(token, list);
    }
    const replies = exact.get(normalized) ?? [];
    replies.push(reply);
    exact.set(normalized, replies);
  }
  return { exact, pairs, postings };
}

async function loadManifest(): Promise<CommunityManifest> {
  const response = await fetch(`${import.meta.env.BASE_URL}chat/community-v2/manifest.json`);
  if (!response.ok) throw new Error(`社区语料清单加载失败（${response.status}）。`);
  const manifest = await response.json() as CommunityManifest;
  if (manifest.version !== 2 || manifest.totalPairs !== COMMUNITY_PAIR_COUNT) throw new Error("社区语料清单版本不匹配。");
  return manifest;
}

async function loadCorpus(shard: CorpusShard): Promise<PreparedCorpus> {
  manifestPromise ??= loadManifest();
  const manifest = await manifestPromise;
  const response = await fetch(`${import.meta.env.BASE_URL}${manifest.shards[shard].path}`);
  return prepareCorpus(await decodeCorpus(response));
}

export async function askCommunityCorpus(prompt: string): Promise<string | null> {
  const shard = detectCorpusShard(prompt);
  let promise = corpusPromises.get(shard);
  if (!promise) {
    promise = loadCorpus(shard);
    corpusPromises.set(shard, promise);
  }
  return findCommunityReply(await promise, prompt);
}

export function prepareCommunityCorpusForTest(pairs: DialogPair[]): PreparedCorpus {
  return prepareCorpus({ version: 2, shard: "zh", sources: ["test"], pairs });
}
