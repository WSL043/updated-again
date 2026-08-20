export interface DayCount {
  date: string;
  count: number;
}

function toDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return toDateString(new Date(Date.UTC(year, month - 1, day + days)));
}

export function countByDay(dates: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const date of dates) {
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return counts;
}

export function currentStreak(counts: Map<string, number>, today: string): number {
  let cursor = today;
  if ((counts.get(cursor) ?? 0) === 0) cursor = shiftDate(cursor, -1);
  let streak = 0;
  while ((counts.get(cursor) ?? 0) > 0) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

export function lastDays(counts: Map<string, number>, days: number, today: string): DayCount[] {
  const window: DayCount[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = shiftDate(today, -offset);
    window.push({ date, count: counts.get(date) ?? 0 });
  }
  return window;
}
