export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Shifts a bare "YYYY-MM-DD" date by `days` (negative to go backward), e.g. for walking a paginated date range one day/month at a time. */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return toISODate(new Date(year, month - 1, day + days));
}

/**
 * A credit card's latest due date (bare "YYYY-MM-DD"): this month's
 * `paymentDay` if already reached, otherwise last month's — the exact date
 * the backend's statement for that card is dated on. Mirrors the backend's
 * own rule (which works in UTC), so this can't drift from it.
 */
export function latestDueDate(paymentDay: number, now = new Date()): string {
  const dueIn = (year: number, month: number) => {
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(paymentDay, lastDay)));
  };
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let due = dueIn(today.getUTCFullYear(), today.getUTCMonth());
  if (due > today) due = dueIn(today.getUTCFullYear(), today.getUTCMonth() - 1);
  return due.toISOString().slice(0, 10);
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

const santiagoClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Santiago",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type Dated = { date: string; fullDateUtc?: string };

/**
 * Whether a transaction's `fullDateUtc` carries a real time. The backend puts
 * entries without one (old rows, subscription bills, card statements) at
 * 00:00 Chilean time on their date, so those — and rows from before the
 * backend migration, which have no `fullDateUtc` at all — are shown as a plain date.
 */
function hasRealTime(fullDateUtc?: string): fullDateUtc is string {
  if (!fullDateUtc) return false;
  const parsed = new Date(fullDateUtc);
  return !Number.isNaN(parsed.getTime()) && santiagoClock.format(parsed) !== "00:00:00";
}

/** A transaction's value for `formatDateTime`: its exact moment when it has a real time, otherwise just its date. */
export function transactionMoment(transaction: Dated): string {
  return hasRealTime(transaction.fullDateUtc) ? transaction.fullDateUtc : transaction.date;
}

/** A transaction's value for a datetime-local input, in the viewer's local time. */
export function transactionDateTimeLocalValue(transaction: Dated): string {
  if (!hasRealTime(transaction.fullDateUtc)) return toDateTimeLocalValue(transaction.date);
  const moment = new Date(transaction.fullDateUtc);
  return new Date(moment.getTime() - moment.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** Orders by calendar day, then by exact moment within the same day. */
export function compareTransactionsByMoment(a: Dated, b: Dated): number {
  return (
    a.date.localeCompare(b.date) || (a.fullDateUtc ?? "").localeCompare(b.fullDateUtc ?? "")
  );
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
