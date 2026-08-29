import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lockPath = path.join(root, "src-tauri", "Cargo.lock");
const lock = fs.readFileSync(lockPath, "utf8");
const packageBlock = /(\[\[package\]\]\r?\nname = "updated-again"\r?\nversion = ")([^"]+)(")/;

if (!packageBlock.test(lock)) {
  throw new Error("Could not find the updated-again package in src-tauri/Cargo.lock.");
}

const next = lock.replace(packageBlock, `$1${packageJson.version}$3`);
if (next !== lock) fs.writeFileSync(lockPath, next);
console.log(`Cargo.lock core version is ${packageJson.version}.`);
