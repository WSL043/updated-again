import { gzipSync } from "node:zlib";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { parse } from "yaml";

const kdConvRoot = process.argv[2] ? resolve(process.argv[2]) : null;
const chatterBotRoot = process.argv[3] ? resolve(process.argv[3]) : null;
const xDailyDialogRoot = process.argv[4] ? resolve(process.argv[4]) : null;
if (!kdConvRoot || !chatterBotRoot || !xDailyDialogRoot) {
  throw new Error(
    "Usage: node scripts/build-community-chat-corpus.mjs <KdConv checkout> <chatterbot-corpus checkout> <XDailyDialog checkout>",
  );
}

const SHARDS = ["zh", "en", "de", "it", "other"];
const pairsByShard = new Map(SHARDS.map((shard) => [shard, []]));
const seenByShard = new Map(SHARDS.map((shard) => [shard, new Set()]));

function addPair(shard, prompt, reply) {
  const cleanPrompt = prompt?.trim();
  const cleanReply = reply?.trim();
  if (!cleanPrompt || !cleanReply || cleanPrompt.length > 600 || cleanReply.length > 600) return;
  const key = `${cleanPrompt}\u0000${cleanReply}`;
  const seen = seenByShard.get(shard);
  if (seen.has(key)) return;
  seen.add(key);
  pairsByShard.get(shard).push([cleanPrompt, cleanReply]);
}

for (const domain of ["film", "music", "travel"]) {
  for (const split of ["train", "dev", "test"]) {
    const conversations = JSON.parse(readFileSync(resolve(kdConvRoot, "data", domain, `${split}.json`), "utf8"));
    for (const conversation of conversations) {
      for (let index = 0; index < conversation.messages.length - 1; index += 1) {
        addPair("zh", conversation.messages[index].message, conversation.messages[index + 1].message);
      }
    }
  }
}

function yamlFiles(root) {
  return readdirSync(root, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name)).flatMap((entry) => {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) return yamlFiles(path);
    return entry.name.endsWith(".yml") ? [path] : [];
  });
}

const chatterBotData = resolve(chatterBotRoot, "chatterbot_corpus", "data");
const chatterBotShard = {
  chinese: "zh",
  traditionalchinese: "zh",
  english: "en",
  german: "de",
  italian: "it",
};
for (const filename of yamlFiles(chatterBotData)) {
  const language = relative(chatterBotData, filename).split(sep)[0];
  const shard = chatterBotShard[language] ?? "other";
  const corpus = parse(readFileSync(filename, "utf8"));
  for (const conversation of corpus.conversations ?? []) {
    for (let index = 0; index < conversation.length - 1; index += 1) addPair(shard, conversation[index], conversation[index + 1]);
  }
}

for (const [language, shard] of Object.entries({ zh: "zh", en: "en", de: "de", it: "it" })) {
  for (const split of ["train", "dev", "test"]) {
    const lines = readFileSync(resolve(xDailyDialogRoot, "data", `${language}_${split}_human.txt`), "utf8").split(/\r?\n/u);
    for (const line of lines) {
      const turns = line.split("\t", 1)[0].split("__eou__").map((turn) => turn.trim()).filter(Boolean);
      for (let index = 0; index < turns.length - 1; index += 1) addPair(shard, turns[index], turns[index + 1]);
    }
  }
}

const outputRoot = resolve("public", "chat", "community-v2");
mkdirSync(outputRoot, { recursive: true });
const sources = [
  "thu-coai/KdConv@653db76432de09a004ba708a68f8bbd5500e6bec",
  "gunthercox/chatterbot-corpus@eec45b284424c9784a5baab78368b1a9ff3b656f",
  "liuzeming01/XDailyDialog@6e7ecf54c9f169215b4b8c18995c7aac74117127",
];
const manifest = { version: 2, totalPairs: 0, shards: {} };
for (const shard of SHARDS) {
  const pairs = pairsByShard.get(shard);
  const filename = `${shard}.json.gz`;
  const payload = JSON.stringify({ version: 2, shard, sources, pairs });
  writeFileSync(resolve(outputRoot, filename), gzipSync(payload, { level: 9 }));
  manifest.totalPairs += pairs.length;
  manifest.shards[shard] = { path: `chat/community-v2/${filename}`, pairCount: pairs.length };
}
writeFileSync(resolve(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifest.totalPairs} dialog pairs across ${SHARDS.length} language shards.`);
