import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ed25519 } from "@noble/curves/ed25519.js";
import { communityPayload, normalizeCommunityIdea } from "./community-lib.mjs";
import { base64ToBytes, bytesToBase64, canonicalize, dateInShanghai, sha256, toUnsignedCapsule } from "./lib.mjs";
import { assertPayload } from "./payload-schema.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const feedPath = join(root, "public", "feed", "index.json");
const updatesRoot = join(root, "public", "updates");
const issue = JSON.parse(process.env.COMMUNITY_ISSUE_JSON || "null");
const dryRun = process.argv.includes("--dry-run");
const signingKeyValue = process.env.CAPSULE_SIGNING_PRIVATE_KEY;
const keyId = process.env.CAPSULE_SIGNING_KEY_ID || "capsule-2026-01";
if (!issue) throw new Error("COMMUNITY_ISSUE_JSON is required.");
const developmentKey = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const signingKey = signingKeyValue ? base64ToBytes(signingKeyValue) : dryRun ? developmentKey : null;
if (!signingKey || signingKey.length !== 32) throw new Error("CAPSULE_SIGNING_PRIVATE_KEY must contain a base64-encoded 32-byte Ed25519 key.");

const idea = normalizeCommunityIdea(issue);
const feed = JSON.parse(await readFile(feedPath, "utf8"));
const recipe = `github-issue-${idea.number}`;
if (feed.entries.some((entry) => entry.recipe === recipe)) {
  process.stdout.write(`${JSON.stringify({ duplicate: true, issue: idea.number })}\n`);
  process.exit(0);
}

const sequence = feed.total + 1;
const date = dateInShanghai();
const publishedAt = new Date().toISOString();
const id = `H-${date.replaceAll("-", "")}-${String(sequence).padStart(4, "0")}-issue-${idea.number}`;
const payload = communityPayload(idea, sequence, date);
assertPayload(idea.kind, payload);
const payloadSha256 = sha256(canonicalize({ kind: idea.kind, payload }));
const capsule = {
  specVersion: 1,
  id,
  sequence,
  coreRequirement: ">=0.1.0-beta.1",
  publishedAt,
  plannedFor: date,
  channel: "experimental",
  kind: idea.kind,
  reason: {
    headline: idea.headline,
    detail: `${idea.reason}（社区提案 #${idea.number}，作者 @${idea.author}）`,
    mood: "社区突然来电",
    absurdity: 86,
  },
  changes: [idea.change],
  expectedEffects: [`提案会通过「${idea.kind}」能力真实改变本地世界；${idea.rollback}`],
  payload,
  generator: { mode: "human", recipe, seed: sha256(`${recipe}:${publishedAt}`) },
  rollback: { strategy: "snapshot" },
  integrity: { algorithm: "ed25519", keyId, payloadSha256, signature: "" },
};
capsule.integrity.signature = bytesToBase64(
  ed25519.sign(new TextEncoder().encode(canonicalize(toUnsignedCapsule(capsule))), signingKey),
);

feed.entries.unshift({
  id,
  sequence,
  publishedAt,
  plannedFor: date,
  channel: capsule.channel,
  kind: capsule.kind,
  headline: capsule.reason.headline,
  mood: capsule.reason.mood,
  absurdity: capsule.reason.absurdity,
  path: `updates/${id}.json`,
  payloadSha256,
  recipe,
  seed: capsule.generator.seed,
});
feed.total = sequence;
feed.latest = id;
feed.generatedAt = publishedAt;

if (dryRun) {
  const verified = ed25519.verify(
    base64ToBytes(capsule.integrity.signature),
    new TextEncoder().encode(canonicalize(toUnsignedCapsule(capsule))),
    ed25519.getPublicKey(signingKey),
  );
  if (!verified) throw new Error("Dry-run community capsule signature did not verify.");
  process.stdout.write(`${JSON.stringify({ dryRun: true, issue: idea.number, id, kind: idea.kind, verified })}\n`);
  process.exit(0);
}

await writeFile(join(updatesRoot, `${id}.json`), `${JSON.stringify(capsule, null, 2)}\n`);
await writeFile(feedPath, `${JSON.stringify(feed, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ duplicate: false, issue: idea.number, id, kind: idea.kind })}\n`);
