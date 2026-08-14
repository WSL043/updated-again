import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ed25519 } from "@noble/curves/ed25519.js";
import { base64ToBytes, canonicalize, sha256, toUnsignedCapsule } from "./lib.mjs";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const feed = JSON.parse(await readFile(join(projectRoot, "public", "feed", "index.json"), "utf8"));

async function readPublicKey() {
  if (process.env.VITE_CAPSULE_PUBLIC_KEY) return process.env.VITE_CAPSULE_PUBLIC_KEY;
  try {
    const env = await readFile(join(projectRoot, ".env.production"), "utf8");
    return env.match(/^VITE_CAPSULE_PUBLIC_KEY=(.+)$/m)?.[1]?.trim() || "";
  } catch {
    return "";
  }
}

const publicKey = await readPublicKey();
const failures = [];
const ids = new Set();
const sequences = new Set();
const days = new Set();

if (feed.specVersion !== 1) failures.push("feed.specVersion must be 1");
if (feed.total !== feed.entries.length) failures.push("feed.total must equal entries.length");
if (feed.entries[0]?.id !== feed.latest) failures.push("feed.latest must match the newest entry");

for (const entry of feed.entries) {
  if (ids.has(entry.id)) failures.push(`duplicate id: ${entry.id}`);
  if (sequences.has(entry.sequence)) failures.push(`duplicate sequence: ${entry.sequence}`);
  ids.add(entry.id);
  sequences.add(entry.sequence);
  days.add(entry.plannedFor);

  try {
    const capsule = JSON.parse(await readFile(join(projectRoot, "public", entry.path), "utf8"));
    if (capsule.id !== entry.id) failures.push(`${entry.id}: capsule id mismatch`);
    if (capsule.sequence !== entry.sequence) failures.push(`${entry.id}: sequence mismatch`);
    const payloadHash = sha256(canonicalize({ kind: capsule.kind, payload: capsule.payload }));
    if (payloadHash !== capsule.integrity.payloadSha256 || payloadHash !== entry.payloadSha256) {
      failures.push(`${entry.id}: payload hash mismatch`);
    }
    if (publicKey) {
      const verified = ed25519.verify(
        base64ToBytes(capsule.integrity.signature),
        new TextEncoder().encode(canonicalize(toUnsignedCapsule(capsule))),
        base64ToBytes(publicKey),
      );
      if (!verified) failures.push(`${entry.id}: signature verification failed`);
    }
    if (!capsule.changes?.length || !capsule.expectedEffects?.length) {
      failures.push(`${entry.id}: update must declare real changes and expected effects`);
    }
  } catch (error) {
    failures.push(`${entry.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const sortedDays = [...days].sort();
for (let index = 1; index < sortedDays.length; index += 1) {
  const previous = new Date(`${sortedDays[index - 1]}T00:00:00Z`);
  const current = new Date(`${sortedDays[index]}T00:00:00Z`);
  if ((current - previous) / 86_400_000 !== 1) {
    failures.push(`calendar gap between ${sortedDays[index - 1]} and ${sortedDays[index]}`);
  }
}

if (failures.length) {
  process.stderr.write(`${failures.map((failure) => `- ${failure}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(
  `Validated ${feed.total} signed update capsule${feed.total === 1 ? "" : "s"} across ${days.size} day${days.size === 1 ? "" : "s"}.\n`,
);
