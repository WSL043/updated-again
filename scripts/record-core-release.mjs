import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ed25519 } from "@noble/curves/ed25519.js";
import {
  base64ToBytes,
  bytesToBase64,
  canonicalize,
  dateInShanghai,
  sha256,
  toUnsignedCapsule,
} from "./lib.mjs";

const version = process.env.CORE_VERSION?.replace(/^v/, "");
const privateKeyValue = process.env.CAPSULE_SIGNING_PRIVATE_KEY;
if (!version) throw new Error("CORE_VERSION is required.");
if (!privateKeyValue) throw new Error("CAPSULE_SIGNING_PRIVATE_KEY is required.");

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const feedPath = join(projectRoot, "public", "feed", "index.json");
const feed = JSON.parse(await readFile(feedPath, "utf8"));
if (feed.entries.some((entry) => entry.channel === "core" && entry.recipe === `core-${version}`)) {
  process.stdout.write(`Core ${version} is already recorded.\n`);
  process.exit(0);
}

const sequence = feed.total + 1;
const date = process.env.UPDATE_DATE || dateInShanghai();
const id = `C-${version.replaceAll(/[^0-9A-Za-z.-]/g, "-")}-${String(sequence).padStart(4, "0")}`;
const payload = {
  text: `核心程序已经更新到 ${version}。日更胶囊继续沿用自己的时间线。`,
  version,
};
const payloadSha256 = sha256(canonicalize({ kind: "message", payload }));
const capsule = {
  specVersion: 1,
  id,
  sequence,
  coreRequirement: `>=${version}`,
  publishedAt: new Date().toISOString(),
  plannedFor: date,
  channel: "core",
  kind: "message",
  reason: {
    headline: `真正的玩法更新抵达 Core ${version}`,
    detail: process.env.CORE_REASON || "这次不只是心情变化：核心程序本身获得了新的能力。",
    mood: "认真更新",
    absurdity: 24,
  },
  changes: [process.env.CORE_CHANGES || `桌面核心升级到 ${version}。`],
  expectedEffects: ["客户端可以通过签名的核心更新通道获得新能力。"],
  payload,
  generator: {
    mode: "human",
    recipe: `core-${version}`,
    seed: sha256(`core:${version}`),
  },
  rollback: { strategy: "snapshot" },
  integrity: {
    algorithm: "ed25519",
    keyId: process.env.CAPSULE_SIGNING_KEY_ID || "capsule-2026-01",
    payloadSha256,
    signature: "",
  },
};
capsule.integrity.signature = bytesToBase64(
  ed25519.sign(
    new TextEncoder().encode(canonicalize(toUnsignedCapsule(capsule))),
    base64ToBytes(privateKeyValue),
  ),
);

feed.entries.unshift({
  id,
  sequence,
  publishedAt: capsule.publishedAt,
  plannedFor: date,
  channel: "core",
  kind: "message",
  headline: capsule.reason.headline,
  mood: capsule.reason.mood,
  absurdity: capsule.reason.absurdity,
  path: `updates/${id}.json`,
  payloadSha256,
  recipe: `core-${version}`,
  seed: capsule.generator.seed,
});
feed.total = sequence;
feed.latest = id;
feed.generatedAt = capsule.publishedAt;

await writeFile(join(projectRoot, "public", "updates", `${id}.json`), `${JSON.stringify(capsule, null, 2)}\n`);
await writeFile(feedPath, `${JSON.stringify(feed, null, 2)}\n`);
process.stdout.write(`Recorded core ${version} as ${id}.\n`);
