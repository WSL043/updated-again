/** User-facing calendar dates follow the device time zone. Date seeds stay YYYY-MM-DD. */
export function localDay(now = new Date(), timeZone?: string): string {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid date");
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}
