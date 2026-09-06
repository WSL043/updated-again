import { EXPERIMENT_BY_ID, EXPERIMENTS, validMaterial, type Material } from "./patch-playground";

export const NOTEBOOK_KEY = "updated-again:play-notebook:v1";
export const MATERIAL_CACHE_KEY = "updated-again:play-materials:v1";
export const MAX_NOTEBOOK_BYTES = 32_768;
export interface Notebook { format: "updated-again/play-notebook"; version: 1; discoveries: string[] }
export type NotebookStorage = Pick<Storage, "getItem" | "setItem">;
export const emptyNotebook = (): Notebook => ({ format: "updated-again/play-notebook", version: 1, discoveries: [] });

export function parseNotebook(text: string): Notebook {
  if (text.length > MAX_NOTEBOOK_BYTES || new TextEncoder().encode(text).byteLength > MAX_NOTEBOOK_BYTES) throw new Error("笔记太大了，最多支持 32 KB。");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("不是有效的实验笔记 JSON。"); }
  if (!value || typeof value !== "object") throw new Error("笔记格式不对。");
  const data = value as Record<string, unknown>;
  if (data.format !== "updated-again/play-notebook" || data.version !== 1) throw new Error("不支持这个笔记版本；原笔记没有改动。");
  if (!Array.isArray(data.discoveries) || data.discoveries.length > EXPERIMENTS.length ||
    !data.discoveries.every((id) => typeof id === "string" && EXPERIMENT_BY_ID.has(id))) {
    throw new Error("笔记含有无法识别的配方；原笔记没有改动。");
  }
  return { ...emptyNotebook(), discoveries: [...new Set(data.discoveries as string[])].sort() };
}
export function mergeNotebooks(...notebooks: readonly Notebook[]): Notebook {
  return { ...emptyNotebook(), discoveries: [...new Set(notebooks.flatMap((book) => book.discoveries))].filter((id) => EXPERIMENT_BY_ID.has(id)).sort() };
}
export function discover(notebook: Notebook, id: string): Notebook {
  if (!EXPERIMENT_BY_ID.has(id)) throw new Error("未知实验。");
  return mergeNotebooks(notebook, { ...emptyNotebook(), discoveries: [id] });
}
export function serializeNotebook(notebook: Notebook): string {
  return JSON.stringify(mergeNotebooks(notebook), null, 2);
}
export function loadNotebook(storage: NotebookStorage): Notebook {
  const text = storage.getItem(NOTEBOOK_KEY);
  return text === null ? emptyNotebook() : parseNotebook(text);
}
/** Read/merge/write, never silently replace a damaged or newer-format notebook. */
export function saveNotebook(storage: NotebookStorage, notebook: Notebook): Notebook {
  const merged = mergeNotebooks(loadNotebook(storage), notebook);
  const text = serializeNotebook(merged);
  if (storage.getItem(NOTEBOOK_KEY) !== text) storage.setItem(NOTEBOOK_KEY, text);
  return merged;
}
export function loadMaterialCache(storage: NotebookStorage): Material[] {
  try {
    const text = storage.getItem(MATERIAL_CACHE_KEY);
    if (!text || text.length > MAX_NOTEBOOK_BYTES) return [];
    const data: unknown = JSON.parse(text);
    return Array.isArray(data) && data.length <= 7 && data.every(validMaterial) ? data : [];
  } catch { return []; }
}
export function saveMaterialCache(storage: NotebookStorage, materials: readonly Material[]): void {
  const bounded = new Map(materials.filter(validMaterial).map((item) => [item.kind, item]));
  const text = JSON.stringify([...bounded.values()]);
  if (storage.getItem(MATERIAL_CACHE_KEY) !== text) storage.setItem(MATERIAL_CACHE_KEY, text);
}
