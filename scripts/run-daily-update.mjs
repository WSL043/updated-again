import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ed25519 } from "@noble/curves/ed25519.js";
import {
  base64ToBytes,
  bytesToBase64,
  canonicalize,
  dateInShanghai,
  materialize,
  pick,
  seededRandom,
  sha256,
  toUnsignedCapsule,
  weightedPick,
} from "./lib.mjs";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const feedPath = join(projectRoot, "public", "feed", "index.json");
const updatesRoot = join(projectRoot, "public", "updates");
const recipes = JSON.parse(await readFile(join(projectRoot, "content", "recipes.json"), "utf8"));
const argv = new Set(process.argv.slice(2));
const dryRun = argv.has("--dry-run");
const force = argv.has("--force");
const slot = Number(process.env.UPDATE_SLOT ?? 4);
const today = process.env.UPDATE_DATE || dateInShanghai();
const chaosSecret = process.env.CHAOS_SEED || "updated-again-public-chaos";
const keyId = process.env.CAPSULE_SIGNING_KEY_ID || "capsule-2026-01";
const signingKeyValue = process.env.CAPSULE_SIGNING_PRIVATE_KEY;

if (!Number.isInteger(slot) || slot < 0 || slot > 4) {
  throw new Error("UPDATE_SLOT must be an integer between 0 and 4.");
}

const developmentKey = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const signingKey = signingKeyValue ? base64ToBytes(signingKeyValue) : dryRun ? developmentKey : null;
if (!signingKey || signingKey.length !== 32) {
  throw new Error("CAPSULE_SIGNING_PRIVATE_KEY must contain a base64-encoded 32-byte Ed25519 key.");
}

const feed = JSON.parse(await readFile(feedPath, "utf8"));

function dateDistance(left, right) {
  return Math.floor((Date.parse(`${right}T00:00:00Z`) - Date.parse(`${left}T00:00:00Z`)) / 86_400_000);
}

function datesBetween(from, to) {
  const dates = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function eligibleRecipes(date) {
  return recipes.filter((recipe) => {
    const previous = feed.entries.find((entry) => entry.recipe === recipe.id);
    return !previous || dateDistance(previous.plannedFor, date) >= recipe.cooldownDays;
  });
}

function createCapsule(date, mode = "deterministic") {
  const sequence = feed.total + 1;
  const seed = sha256(`${chaosSecret}:${date}:${sequence}:${mode}`);
  const random = seededRandom(seed);
  const candidates = eligibleRecipes(date);
  const pool = candidates.length ? candidates : recipes;
  const recipe = weightedPick(random, pool, (candidate) => candidate.weight);
  const context = { date, sequence };
  const payload = materialize(recipe.payload, context, random);
  const reason = {
    headline: materialize(recipe.headline, context, random),
    detail: materialize(recipe.detail, context, random),
    mood: materialize(recipe.mood, context, random),
    absurdity: recipe.absurdity,
  };
  const id = `D-${date.replaceAll("-", "")}-${String(sequence).padStart(4, "0")}-${recipe.id}`;
  const payloadSha256 = sha256(canonicalize({ kind: recipe.kind, payload }));
  const capsule = {
    specVersion: 1,
    id,
    sequence,
    coreRequirement: ">=0.1.0-beta.1",
    publishedAt: new Date().toISOString(),
    plannedFor: date,
    channel: recipe.absurdity >= 80 ? "weird" : "daily",
    kind: recipe.kind,
    reason,
    changes: [materialize(recipe.change, context, random)],
    expectedEffects: [materialize(recipe.effect, context, random)],
    payload,
    generator: { mode, recipe: recipe.id, seed },
    rollback: { strategy: "snapshot" },
    integrity: {
      algorithm: "ed25519",
      keyId,
      payloadSha256,
      signature: "",
    },
  };
  capsule.integrity.signature = bytesToBase64(
    ed25519.sign(new TextEncoder().encode(canonicalize(toUnsignedCapsule(capsule))), signingKey),
  );

  feed.entries.unshift({
    id,
    sequence,
    publishedAt: capsule.publishedAt,
    plannedFor: date,
    channel: capsule.channel,
    kind: capsule.kind,
    headline: capsule.reason.headline,
    mood: capsule.reason.mood,
    absurdity: capsule.reason.absurdity,
    path: `updates/${id}.json`,
    payloadSha256,
    recipe: recipe.id,
    seed,
  });
  feed.total = sequence;
  feed.latest = id;
  feed.generatedAt = capsule.publishedAt;
  return capsule;
}

function dailyPlan(date) {
  const random = seededRandom(`${chaosSecret}:plan:${date}`);
  const roll = random();
  const target = roll < 0.68 ? 1 : roll < 0.94 ? 2 : 3;
  const available = [0, 1, 2, 3];
  const slots = [];
  while (slots.length < target && available.length) {
    const chosen = pick(random, available);
    slots.push(chosen);
    available.splice(available.indexOf(chosen), 1);
  }
  return { target, slots: slots.sort() };
}

const created = [];
const historicalDates = [...new Set(feed.entries.map((entry) => entry.plannedFor))].sort();
const latestHistoricalDate = historicalDates.at(-1);
if (latestHistoricalDate && latestHistoricalDate < today) {
  for (const missingDate of datesBetween(latestHistoricalDate, today)) {
    created.push(createCapsule(missingDate, "reserve"));
  }
}

const todayEntries = feed.entries.filter((entry) => entry.plannedFor === today);
const plan = dailyPlan(today);
const shouldPublish =
  force ||
  (plan.slots.includes(slot) && todayEntries.length < plan.target) ||
  (slot === 4 && todayEntries.length === 0);

if (shouldPublish) {
  created.push(createCapsule(today, slot === 4 && todayEntries.length === 0 ? "reserve" : "deterministic"));
}

if (dryRun) {
  process.stdout.write(
    `${JSON.stringify({ date: today, slot, plan, wouldPublish: created.map((capsule) => capsule.id) }, null, 2)}\n`,
  );
  process.exit(0);
}

for (const capsule of created) {
  await writeFile(join(updatesRoot, `${capsule.id}.json`), `${JSON.stringify(capsule, null, 2)}\n`);
}
if (created.length) {
  await writeFile(feedPath, `${JSON.stringify(feed, null, 2)}\n`);
}

process.stdout.write(
  `${JSON.stringify({ date: today, slot, plan, published: created.map((capsule) => capsule.id) })}\n`,
);
