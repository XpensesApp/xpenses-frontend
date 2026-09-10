/** Clamps `day` to the last valid day of the given month (e.g. day 31 in February becomes 28 or 29). */
export function clampDayToMonth(year: number, month: number, day: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(day, daysInMonth);
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Identifies a billing/due period, e.g. "2026-09". */
export function periodKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
