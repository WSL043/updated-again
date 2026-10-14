import { useEffect, useSyncExternalStore } from "react";
import { catalog } from "./messages";

export const LANGUAGES = [{ id: "en", name: "English" }, { id: "zh-CN", name: "简体中文" }, { id: "ja", name: "日本語" }, { id: "es", name: "Español" }] as const;
export type Language = (typeof LANGUAGES)[number]["id"];
export const LANGUAGE_KEY = "updated-again:language:v1";
export function readLanguage(): Language {
  try { const value = localStorage.getItem(LANGUAGE_KEY); if (LANGUAGES.some((item) => item.id === value)) return value as Language; } catch { /* English remains available without storage. */ }
  return "en";
}
let language: Language = readLanguage();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
export const getLanguage = () => language;
export function setLanguage(next: Language): boolean {
  if (!LANGUAGES.some((item) => item.id === next)) return false;
  let saved = true;
  try { localStorage.setItem(LANGUAGE_KEY, next); } catch { saved = false; }
  language = next;
  if (typeof document !== "undefined") document.documentElement.lang = next;
  listeners.forEach((listener) => listener());
  return saved;
}
export function useLanguage() {
  const selected = useSyncExternalStore(subscribe, getLanguage, () => "en" as Language);
  useEffect(() => { document.documentElement.lang = selected; }, [selected]);
  return selected;
}
const columns = { en: 0, ja: 1, es: 2 } as const;
const chineseLabels: Record<string, string> = { "Language": "语言", "Local time": "本地时间", "Language preference could not be saved.": "未能保存语言设置。", "Original release content": "版本说明和本机世界内容保持原文显示。" };
const aliases = new Map<string, string>();
for (const [key, values] of Object.entries(catalog)) for (const text of [key, ...values]) aliases.set(text, key);
const patterns = Object.entries(catalog).filter(([key]) => /\{\d+\}/.test(key)).map(([key, values]) => ({ key, variants: [key, ...values].map((text) => {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{\d+\\\}/g, "(.+?)");
  return new RegExp(`^${escaped}$`, "u");
}) }));

/** Explicit source-keyed messages. Unknown release text is preserved, never sent to a translation service. */
export function t(text: string, args?: readonly (string | number | null | undefined)[], locale?: Language): string;
export function t(text: string | undefined, args?: readonly (string | number | null | undefined)[], locale?: Language): string | undefined;
export function t(text: string | undefined, args: readonly (string | number | null | undefined)[] = [], locale: Language = language): string | undefined {
  if (text === undefined) return undefined;
  const key = aliases.get(text) ?? aliases.get(text.trim()) ?? text;
  const row = catalog[key];
  if (row) {
    const template = locale === "zh-CN" ? chineseLabels[key] ?? key : row[columns[locale]];
    return template.replace(/\{(\d+)\}/g, (_, index: string) => {
      const value = args[Number(index)];
      return typeof value === "string" ? t(value, [], locale) : String(value ?? `{${index}}`);
    });
  }
  if (!args.length) for (const pattern of patterns) for (const variant of pattern.variants) {
    const match = variant.exec(text);
    if (match) return t(pattern.key, match.slice(1).map((part) => t(part, [], locale)), locale);
  }
  return text;
}
