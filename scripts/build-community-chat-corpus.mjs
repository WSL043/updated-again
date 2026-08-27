import { gzipSync } from "node:zlib";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

const sourceRoot = process.argv[2] ? resolve(process.argv[2]) : null;
const chatterBotRoot = process.argv[3] ? resolve(process.argv[3]) : null;
if (!sourceRoot || !chatterBotRoot) {
  throw new Error("Usage: node scripts/build-community-chat-corpus.mjs <KdConv checkout> <chatterbot-corpus checkout>");
}

const splits = ["train", "dev", "test"];
const domains = ["film", "music", "travel"];
const seen = new Set();
const pairs = [];

function addPair(prompt, reply) {
  const cleanPrompt = prompt?.trim();
  const cleanReply = reply?.trim();
  if (!cleanPrompt || !cleanReply || cleanPrompt.length > 600 || cleanReply.length > 600) return;
  const key = `${cleanPrompt}\u0000${cleanReply}`;
  if (seen.has(key)) return;
  seen.add(key);
  pairs.push([cleanPrompt, cleanReply]);
}

for (const domain of domains) {
  for (const split of splits) {
    const conversations = JSON.parse(readFileSync(resolve(sourceRoot, "data", domain, `${split}.json`), "utf8"));
    for (const conversation of conversations) {
      for (let index = 0; index < conversation.messages.length - 1; index += 1) {
        addPair(conversation.messages[index].message, conversation.messages[index + 1].message);
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
for (const filename of yamlFiles(chatterBotData)) {
  const corpus = parse(readFileSync(filename, "utf8"));
  for (const conversation of corpus.conversations ?? []) {
    for (let index = 0; index < conversation.length - 1; index += 1) addPair(conversation[index], conversation[index + 1]);
  }
}

const payload = JSON.stringify({
  version: 1,
  sources: [
    "thu-coai/KdConv@653db76432de09a004ba708a68f8bbd5500e6bec",
    "gunthercox/chatterbot-corpus@eec45b284424c9784a5baab78368b1a9ff3b656f",
  ],
  pairs,
});
const output = resolve("public", "chat", "community-v1.json.gz");
mkdirSync(resolve("public", "chat"), { recursive: true });
writeFileSync(output, gzipSync(payload, { level: 9 }));
console.log(`Wrote ${pairs.length} community dialog pairs to ${output}`);
