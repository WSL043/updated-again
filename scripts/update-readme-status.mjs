import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { renderStatus, replaceStatus, summarizeFeed } from "./readme-status.mjs";

const readmePath = fileURLToPath(new URL("../README.md", import.meta.url));
const feed = JSON.parse(await readFile(new URL("../public/feed/index.json", import.meta.url), "utf8"));
const readme = (await readFile(readmePath, "utf8")).replaceAll("\r\n", "\n");
const stats = summarizeFeed(feed);
await writeFile(readmePath, replaceStatus(readme, renderStatus(stats)));
console.log(`README refreshed for ${stats.today}: ${stats.onTimeStreak} on-time days, ${stats.coverageStreak} ledger days.`);
