/** Dates are handled in the school's timezone (India Standard Time). */

export const SCHOOL_TZ = "Asia/Kolkata";

const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: SCHOOL_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export function todayIST(now = new Date()): string {
  return ymd.format(now);
}

/** Add days to a YYYY-MM-DD date string. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** The last `n` school days (Monday to Saturday) up to and including `end`. */
export function lastSchoolDays(end: string, n: number): string[] {
  const out: string[] = [];
  let d = end;
  while (out.length < n) {
    if (weekday(d) !== 0) out.push(d);
    d = addDays(d, -1);
  }
  return out.reverse();
}

export function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { timeZone: SCHOOL_TZ, day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { timeZone: SCHOOL_TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  return dateFmt.format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}

export function fmtDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return dateTimeFmt.format(new Date(value));
}
