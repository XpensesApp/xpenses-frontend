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

/** Local "YYYY-MM-DDTHH:mm" for right now, suitable as a datetime-local input's default value. */
export function nowLocalDateTime(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** Normalizes a stored date (bare "YYYY-MM-DD" or full datetime) to a datetime-local input's expected value. */
export function toDateTimeLocalValue(date: string): string {
  return date.length === 10 ? `${date}T00:00` : date.slice(0, 16);
}

/** Formats a stored date (bare "YYYY-MM-DD" or full datetime) for display. */
export function formatDateTime(date: string): string {
  if (date.length > 10) {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString();
}
