import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const tauriConfig = JSON.parse(fs.readFileSync(path.join(root, "src-tauri", "tauri.conf.json"), "utf8"));
const cargoToml = fs.readFileSync(path.join(root, "src-tauri", "Cargo.toml"), "utf8");
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const cargoLock = fs.readFileSync(path.join(root, "src-tauri", "Cargo.lock"), "utf8");
const cargoLockVersion = cargoLock.match(/\[\[package\]\]\r?\nname = "updated-again"\r?\nversion = "([^"]+)"/)?.[1];
const releaseManifest = JSON.parse(fs.readFileSync(path.join(root, ".release-please-manifest.json"), "utf8"));

const versions = {
  package: packageJson.version,
  tauri: tauriConfig.version,
  cargo: cargoVersion,
  cargoLock: cargoLockVersion,
  releaseManifest: releaseManifest["."],
};

const distinct = new Set(Object.values(versions));
if (distinct.size !== 1 || !cargoVersion) {
  throw new Error(`Core versions disagree: ${JSON.stringify(versions)}`);
}

const tag = process.env.GITHUB_REF_NAME;
if (tag?.startsWith("v") && tag.slice(1) !== packageJson.version) {
  throw new Error(`Release tag ${tag} does not match core version ${packageJson.version}`);
}

console.log(`Core version contract valid: ${packageJson.version}`);
