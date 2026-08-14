import { installCapsule } from "../capabilities";
import { verifyCapsule } from "./signature";
import type { FeedIndex, LocalArchive, UpdateCapsule } from "./types";

const BASE_URL = import.meta.env.VITE_UPDATE_BASE_URL || new URL(import.meta.env.BASE_URL, window.location.href).toString();
const PUBLIC_KEY = import.meta.env.VITE_CAPSULE_PUBLIC_KEY || "";

function absolutePath(path: string): string {
  return new URL(path.replace(/^\//, ""), BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`).toString();
}

export async function fetchFeed(): Promise<FeedIndex> {
  const response = await fetch(absolutePath("feed/index.json"), { cache: "no-store" });
  if (!response.ok) throw new Error(`更新账本不可用：HTTP ${response.status}`);
  return response.json() as Promise<FeedIndex>;
}

export async function fetchCapsule(path: string): Promise<UpdateCapsule> {
  const response = await fetch(absolutePath(path), { cache: "no-store" });
  if (!response.ok) throw new Error(`更新胶囊不可用：HTTP ${response.status}`);
  return response.json() as Promise<UpdateCapsule>;
}

export async function installVerifiedCapsule(archive: LocalArchive, capsule: UpdateCapsule): Promise<LocalArchive> {
  if (!PUBLIC_KEY) {
    if (import.meta.env.PROD) throw new Error("生产构建缺少更新签名公钥。");
  } else if (!(await verifyCapsule(capsule, PUBLIC_KEY))) {
    throw new Error("更新签名或内容哈希验证失败。");
  }
  return installCapsule(archive, capsule);
}

export async function findPendingCapsules(feed: FeedIndex, archive: LocalArchive): Promise<UpdateCapsule[]> {
  const installed = new Set(archive.state.installedIds);
  const pending = feed.entries.filter((entry) => !installed.has(entry.id)).sort((a, b) => a.sequence - b.sequence);
  return Promise.all(pending.map((entry) => fetchCapsule(entry.path)));
}
