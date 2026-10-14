import { readFile } from "node:fs/promises";
import { dateInUTC } from "./lib.mjs";
import { assertDeployment } from "./readme-status.mjs";

const site = "https://wsl043.github.io/updated-again/";
const feed = JSON.parse(await readFile(new URL("../public/feed/index.json", import.meta.url), "utf8"));
async function getJson(path) {
  let error;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(new URL(path, site), { signal: AbortSignal.timeout(15_000), cache: "no-store" });
      if (!response.ok) throw new Error(`Pages ${path}: HTTP ${response.status}`);
      return await response.json();
    } catch (failure) { error = failure; }
  }
  throw error;
}
const latest = feed.entries.find((entry) => entry.id === feed.latest);
if (!latest) throw new Error("Latest capsule missing from ledger");
const [remoteFeed, remoteCapsule, localCapsule] = await Promise.all([
  getJson("feed/index.json"), getJson(latest.path),
  readFile(new URL(`../public/${latest.path}`, import.meta.url), "utf8").then(JSON.parse),
]);
assertDeployment(feed, remoteFeed, localCapsule, remoteCapsule, dateInUTC());
console.log(`Pages ledger and latest capsule match: ${feed.latest}. All completed UTC release days covered.`);
