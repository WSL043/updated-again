import { t } from "../i18n";
export interface CircuitCard { title: string; subtitle: string; score: string; detail: string; notes: string[]; url: string }
export function circuitCardText(card: CircuitCard): string {
  return [t("又更了 · 补丁接线室"), card.title, card.subtitle, card.score, card.detail, ...card.notes, card.url].join("\n");
}
const xml = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const fit = (text: string, maximum: number) => Math.min(maximum, Math.floor(680 / [...text].reduce((width, char) => width + (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u.test(char) ? 1 : /\s/u.test(char) ? 0.35 : 0.68), 1)));
/** Portable vector image: no external fonts, network resources, or executable markup. */
export function circuitCardSvg(card: CircuitCard): string {
  const height = 420 + card.notes.length * 34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${height}" viewBox="0 0 800 ${height}" role="img" aria-label="${xml(card.title)}">
<rect width="800" height="${height}" fill="#f5f3e9"/><rect x="24" y="24" width="752" height="${height - 48}" rx="16" fill="#171b28"/>
<g fill="#f5f3e9" font-family="system-ui, sans-serif"><text x="60" y="72" font-size="14" letter-spacing="3" fill="#d8ff73">UPDATED AGAIN / CIRCUIT CLUB</text>
<text x="60" y="125" font-size="${fit(card.title, 32)}" font-weight="700">${xml(card.title)}</text><text x="60" y="160" font-size="${fit(card.subtitle, 18)}" fill="#bdc4dc">${xml(card.subtitle)}</text>
<text x="60" y="242" font-size="${fit(card.score, 54)}" font-weight="800" fill="#d8ff73">${xml(card.score)}</text><text x="60" y="283" font-size="${fit(card.detail, 18)}">${xml(card.detail)}</text>
${card.notes.map((note, index) => `<text x="60" y="${325 + index * 34}" font-size="18" fill="#bdc4dc">${xml(note)}</text>`).join("\n")}
<path d="M60 ${height - 72}H740" stroke="#59617a"/><text x="60" y="${height - 44}" font-size="14" fill="#bdc4dc">wsl043.github.io/updated-again · ${xml(t("本机成绩"))}</text></g></svg>`;
}
