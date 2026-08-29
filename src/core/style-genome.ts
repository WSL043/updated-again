import type { CSSProperties } from "react";
import type { UpdateKind } from "./types";

type Rgb = [number, number, number];
type Hsl = [number, number, number];

export type StyleComposition = "editorial" | "text-led" | "broadcast-led";
export type StyleGeometry = "orbit" | "block" | "diamond";
export type StyleTexture = "grid" | "dots" | "stripes";

export interface StyleGenome {
  id: string;
  date: string;
  label: string;
  composition: StyleComposition;
  geometry: StyleGeometry;
  texture: StyleTexture;
  colors: {
    paper: string;
    paperStrong: string;
    ink: string;
    muted: string;
    line: string;
    signal: string;
    accent: string;
  };
  cssVariables: CSSProperties & Record<`--${string}`, string>;
}

function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function randomFrom(seed: number) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hslToRgb([hue, saturation, lightness]: Hsl): Rgb {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = (((hue % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] = segment < 1 ? [chroma, x, 0]
    : segment < 2 ? [x, chroma, 0]
      : segment < 3 ? [0, chroma, x]
        : segment < 4 ? [0, x, chroma]
          : segment < 5 ? [x, 0, chroma]
            : [chroma, 0, x];
  const match = l - chroma / 2;
  return [red, green, blue].map((channel) => Math.round((channel + match) * 255)) as Rgb;
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function luminance([red, green, blue]: Rgb): number {
  const linear = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function contrastRatio(left: string, right: string): number {
  const parse = (value: string): Rgb => {
    const hex = value.replace("#", "");
    return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as Rgb;
  };
  const first = luminance(parse(left));
  const second = luminance(parse(right));
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function accessibleColor(hue: number, saturation: number, lightness: number, against: string, target: number, direction: -1 | 1): string {
  let current = lightness;
  let color = toHex(hslToRgb([hue, saturation, current]));
  while (contrastRatio(color, against) < target && current > 12 && current < 88) {
    current += direction * 2;
    color = toHex(hslToRgb([hue, saturation, current]));
  }
  return color;
}

export function dateInShanghai(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function createStyleGenome(input: {
  date?: string;
  updateSeed?: string;
  kind?: UpdateKind;
  sequence?: number;
} = {}): StyleGenome {
  const date = input.date || dateInShanghai();
  const baseHash = hash32(`updated-again:visual-v1:${date}`);
  const mutationHash = hash32(`${input.updateSeed ?? "waiting"}:${input.kind ?? "none"}:${input.sequence ?? 0}`);
  const baseRandom = randomFrom(baseHash);
  const mutationRandom = randomFrom(mutationHash);
  const hue = Math.floor(baseRandom() * 360);
  const mutation = Math.round((mutationRandom() - 0.5) * 24);

  const paper = toHex(hslToRgb([hue, 13 + Math.round(baseRandom() * 7), 94 + Math.round(baseRandom() * 2)]));
  const paperStrong = toHex(hslToRgb([hue, 10, 99]));
  const ink = toHex(hslToRgb([(hue + 12) % 360, 16, 8 + Math.round(baseRandom() * 3)]));
  const muted = accessibleColor((hue + 8) % 360, 9, 42, paper, 4.5, -1);
  const line = toHex(hslToRgb([(hue + 6) % 360, 9, 76]));
  const signalHue = (hue + 70 + Math.floor(baseRandom() * 190) + mutation + 360) % 360;
  const signal = accessibleColor(signalHue, 88, 62, ink, 7, 1);
  const accentHue = (signalHue + 95 + Math.floor(mutationRandom() * 80)) % 360;
  const accent = accessibleColor(accentHue, 74, 46, paper, 4.5, -1);
  const compositions: StyleComposition[] = ["editorial", "text-led", "broadcast-led"];
  const geometries: StyleGeometry[] = ["orbit", "block", "diamond"];
  const textures: StyleTexture[] = ["grid", "dots", "stripes"];
  const composition = compositions[Math.floor(baseRandom() * compositions.length)];
  const geometry = geometries[Math.floor(baseRandom() * geometries.length)];
  const texture = textures[Math.floor(baseRandom() * textures.length)];
  const gap = 108 + Math.floor(baseRandom() * 27);
  const maxWidth = 1260 + Math.floor(baseRandom() * 81);
  const id = `${baseHash.toString(16).padStart(8, "0").slice(0, 4)}-${mutationHash.toString(16).padStart(8, "0").slice(0, 4)}`;
  const geometryNames: Record<StyleGeometry, string> = { orbit: "轨道", block: "活字", diamond: "折角" };
  const textureNames: Record<StyleTexture, string> = { grid: "方格", dots: "网点", stripes: "走线" };

  const colors = { paper, paperStrong, ink, muted, line, signal, accent };
  return {
    id,
    date,
    label: `${geometryNames[geometry]} / ${textureNames[texture]}`,
    composition,
    geometry,
    texture,
    colors,
    cssVariables: {
      "--paper": paper,
      "--paper-strong": paperStrong,
      "--ink": ink,
      "--muted": muted,
      "--line": line,
      "--signal": signal,
      "--violet": accent,
      "--max": `${maxWidth}px`,
      "--section-gap": `${gap}px`,
      "--genome-angle": `${Math.round((mutationRandom() - 0.5) * 12)}deg`,
    },
  };
}
