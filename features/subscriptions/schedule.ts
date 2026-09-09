function clampDayToMonth(year: number, month: number, day: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(day, daysInMonth);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * The most recent date matching `billingDay` that falls on or before `today`.
 * Returns null if that date would fall before `createdAt` — a subscription
 * can't retroactively bill for a cycle that occurred before it existed.
 */
export function mostRecentBillingDate(
  billingDay: number,
  today: Date,
  createdAt: Date
): Date | null {
  const thisMonthDay = clampDayToMonth(today.getFullYear(), today.getMonth(), billingDay);
  let candidate = new Date(today.getFullYear(), today.getMonth(), thisMonthDay);

  if (candidate > today) {
    const prevMonthDay = clampDayToMonth(today.getFullYear(), today.getMonth() - 1, billingDay);
    candidate = new Date(today.getFullYear(), today.getMonth() - 1, prevMonthDay);
  }

  if (candidate < startOfDay(createdAt)) return null;
  return candidate;
}

/** Identifies a billing cycle, e.g. "2026-09". */
export function billingPeriodKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
