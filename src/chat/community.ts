export const COMMUNITY_PAIR_COUNT = 89_856;

type DialogPair = [prompt: string, reply: string];

interface CommunityCorpus {
  version: number;
  sources: string[];
  pairs: DialogPair[];
}

interface PreparedCorpus {
  exact: Map<string, string[]>;
  pairs: Array<[normalizedPrompt: string, reply: string]>;
}

let corpusPromise: Promise<PreparedCorpus> | undefined;

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

function bigrams(value: string): Set<string> {
  if (value.length < 2) return new Set(value ? [value] : []);
  const result = new Set<string>();
  for (let index = 0; index < value.length - 1; index += 1) result.add(value.slice(index, index + 2));
  return result;
}

function similarity(left: Set<string>, rightValue: string): number {
  const right = bigrams(rightValue);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return (2 * overlap) / (left.size + right.size);
}

export function findCommunityReply(corpus: PreparedCorpus, prompt: string): string | null {
  const normalized = normalizePrompt(prompt);
  if (!normalized) return null;
  const exact = corpus.exact.get(normalized);
  if (exact?.length) return exact[normalized.length % exact.length];
  if (normalized.length < 3) return null;

  const query = bigrams(normalized);
  let bestReply: string | null = null;
  let bestScore = 0;
  for (const [candidate, reply] of corpus.pairs) {
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
  if (data.version !== 1 || !Array.isArray(data.pairs)) throw new Error("社区语料格式不受支持。");
  const exact = new Map<string, string[]>();
  const pairs: PreparedCorpus["pairs"] = [];
  for (const [prompt, reply] of data.pairs) {
    if (typeof prompt !== "string" || typeof reply !== "string") continue;
    const normalized = normalizePrompt(prompt);
    if (!normalized) continue;
    pairs.push([normalized, reply]);
    const replies = exact.get(normalized) ?? [];
    replies.push(reply);
    exact.set(normalized, replies);
  }
  return { exact, pairs };
}

async function loadCorpus(): Promise<PreparedCorpus> {
  const url = `${import.meta.env.BASE_URL}chat/community-v1.json.gz`;
  return prepareCorpus(await decodeCorpus(await fetch(url)));
}

export async function askCommunityCorpus(prompt: string): Promise<string | null> {
  corpusPromise ??= loadCorpus();
  return findCommunityReply(await corpusPromise, prompt);
}

export function prepareCommunityCorpusForTest(pairs: DialogPair[]): PreparedCorpus {
  return prepareCorpus({ version: 1, sources: ["test"], pairs });
}
