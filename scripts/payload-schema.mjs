export const UPDATE_KINDS = new Set(["theme", "message", "collectible", "ritual", "companion", "constellation", "button-personality"]);

function stringField(payload, key) {
  if (typeof payload[key] !== "string" || !payload[key].trim()) throw new Error(`payload.${key} must be a non-empty string`);
}

function numberField(payload, key, minimum, maximum) {
  if (typeof payload[key] !== "number" || !Number.isFinite(payload[key]) || payload[key] < minimum || payload[key] > maximum) {
    throw new Error(`payload.${key} must be a finite number between ${minimum} and ${maximum}`);
  }
}

export function assertPayload(kind, payload) {
  if (!UPDATE_KINDS.has(kind)) throw new Error(`unsupported update kind: ${kind}`);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("payload must be an object");
  const strings = {
    theme: ["background", "surface", "accent", "glow", "banner"],
    message: ["text"],
    collectible: ["id", "name", "glyph", "note"],
    ritual: ["instruction", "reward"],
    companion: ["name", "mood", "phrase", "glyph"],
    constellation: ["label"],
    "button-personality": ["label", "temperament"],
  }[kind];
  for (const key of strings) stringField(payload, key);
  if (kind === "theme") {
    for (const key of ["background", "surface", "accent", "glow"]) {
      if (!/^#[0-9a-f]{6}$/i.test(payload[key])) throw new Error(`payload.${key} must be a six-digit hex color`);
    }
  }
  if (kind === "constellation") {
    numberField(payload, "x", 4, 96);
    numberField(payload, "y", 6, 90);
    numberField(payload, "size", 3, 14);
  }
  if (kind === "button-personality" && !["calm", "shy", "dramatic", "bouncy"].includes(payload.temperament)) {
    throw new Error("payload.temperament is not supported");
  }
  if (JSON.stringify(payload).length > 10_000) throw new Error("payload is too large");
  return payload;
}
