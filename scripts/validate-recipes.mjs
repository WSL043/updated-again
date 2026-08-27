import { readFile } from "node:fs/promises";
import { assertPayload } from "./payload-schema.mjs";

const recipes = JSON.parse(await readFile(new URL("../content/recipes.json", import.meta.url), "utf8"));
const kinds = new Set(["theme", "message", "collectible", "ritual", "companion", "constellation", "button-personality"]);
const failures = [];
const ids = new Set();

function materialized(value) {
  if (Array.isArray(value)) return materialized(value[0]);
  if (value && typeof value === "object") {
    if (Array.isArray(value.$random)) return value.$random[0];
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, materialized(child)]));
  }
  return value;
}

function requireString(recipe, value, field, maximum = 500) {
  const sample = materialized(value);
  if (typeof sample !== "string" || !sample.trim() || sample.length > maximum) failures.push(`${recipe.id}: ${field} must materialize to a non-empty string up to ${maximum} characters`);
}

if (!Array.isArray(recipes) || !recipes.length || recipes.length > 100) failures.push("recipes must be a non-empty array with at most 100 entries");
for (const recipe of Array.isArray(recipes) ? recipes : []) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe.id ?? "")) failures.push(`${recipe.id}: invalid id`);
  if (ids.has(recipe.id)) failures.push(`${recipe.id}: duplicate id`);
  ids.add(recipe.id);
  if (!kinds.has(recipe.kind)) failures.push(`${recipe.id}: unsupported kind ${recipe.kind}`);
  if (!Number.isFinite(recipe.weight) || recipe.weight <= 0 || recipe.weight > 100) failures.push(`${recipe.id}: weight must be between 1 and 100`);
  if (!Number.isInteger(recipe.cooldownDays) || recipe.cooldownDays < 0 || recipe.cooldownDays > 365) failures.push(`${recipe.id}: cooldownDays must be between 0 and 365`);
  for (const field of ["headline", "detail", "mood", "change", "effect"]) requireString(recipe, recipe[field], field);
  if (!Number.isFinite(recipe.absurdity) || recipe.absurdity < 0 || recipe.absurdity > 100) failures.push(`${recipe.id}: absurdity must be between 0 and 100`);
  if (!recipe.payload || typeof recipe.payload !== "object" || Array.isArray(recipe.payload)) failures.push(`${recipe.id}: payload must be an object`);
  if (JSON.stringify(recipe).length > 20_000) failures.push(`${recipe.id}: recipe is too large`);

  try {
    assertPayload(recipe.kind, materialized(recipe.payload ?? {}));
  } catch (error) {
    failures.push(`${recipe.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  process.stderr.write(`${failures.map((failure) => `- ${failure}`).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`Validated ${recipes.length} declarative update recipes.\n`);
