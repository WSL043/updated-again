import { createHash } from "node:crypto";

export function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalize(child)]),
    );
  }
  return value;
}

export function canonicalize(value) {
  return JSON.stringify(normalize(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function bytesToBase64(value) {
  return Buffer.from(value).toString("base64");
}

export function base64ToBytes(value) {
  return Uint8Array.from(Buffer.from(value.trim(), "base64"));
}

export function seededRandom(seedText) {
  let seed = Number.parseInt(sha256(seedText).slice(0, 8), 16) >>> 0;
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}

export function weightedPick(random, items, weightOf) {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let cursor = random() * total;
  for (const item of items) {
    cursor -= weightOf(item);
    if (cursor <= 0) return item;
  }
  return items.at(-1);
}

export function materialize(value, context, random) {
  if (Array.isArray(value)) return materialize(pick(random, value), context, random);
  if (value && typeof value === "object") {
    if (Array.isArray(value.$random) && value.$random.length === 2) {
      const [minimum, maximum] = value.$random;
      return Math.round(minimum + random() * (maximum - minimum));
    }
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, materialize(child, context, random)]));
  }
  if (typeof value !== "string") return value;
  return value
    .replaceAll("{{date}}", context.date)
    .replaceAll("{{sequence}}", String(context.sequence));
}

export function dateInShanghai(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export function toUnsignedCapsule(capsule) {
  return {
    ...capsule,
    integrity: {
      ...capsule.integrity,
      signature: "",
    },
  };
}
