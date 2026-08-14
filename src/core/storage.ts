import { DEFAULT_ARCHIVE } from "./state";
import type { LocalArchive } from "./types";

const STORAGE_KEY = "updated-again.archive.v1";

export function loadArchive(): LocalArchive {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(DEFAULT_ARCHIVE);

  try {
    const archive = JSON.parse(stored) as LocalArchive;
    if (archive.state.schemaVersion !== 1 || !Array.isArray(archive.history)) {
      return structuredClone(DEFAULT_ARCHIVE);
    }
    return archive;
  } catch {
    return structuredClone(DEFAULT_ARCHIVE);
  }
}

export function saveArchive(archive: LocalArchive): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
}

export function clearArchive(): void {
  localStorage.removeItem(STORAGE_KEY);
}
