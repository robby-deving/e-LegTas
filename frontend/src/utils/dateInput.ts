// src/utils/dateInput.ts

/** Format a Date to MM/DD/YYYY (always 2-digit month/day). */
export function formatMMDDYYYY(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/** Parse MM/DD/YYYY into a Date (returns null if invalid, e.g., 02/31/2024). */
export function parseMMDDYYYY(value: string): Date | null {
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const yyyy = Number(m[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;

  return d;
}

/** YYYY-MM-DD using local calendar parts (no TZ shift). */
export function toISODateLocal(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

/** Merge a date-only and time-only into a single Date. */
export function mergeDateAndTime(dateOnly: Date | null, timeOnly: Date | null): Date | null {
  if (!dateOnly) return null;
  const hours = timeOnly ? timeOnly.getHours() : 0;
  const mins = timeOnly ? timeOnly.getMinutes() : 0;
  return new Date(
    dateOnly.getFullYear(),
    dateOnly.getMonth(),
    dateOnly.getDate(),
    hours,
    mins,
    0,
    0
  );
}

/** Start of day in local time for comparisons. */
export function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** Constants (runtime-safe) + type for bound failures — no `enum`. */
export const DateBound = {
  BeforeMin: "beforeMin",
  AfterMax: "afterMax",
} as const;

export type DateBoundKind = typeof DateBound[keyof typeof DateBound];

/**
 * Check a date against optional min/max bounds (date-only comparison).
 * Returns ok:true if within bounds; otherwise ok:false with kind + bound.
 */
export function checkDateBounds(
  date: Date,
  minDate?: Date,
  maxDate?: Date
): { ok: true } | { ok: false; kind: DateBoundKind; bound: Date } {
  const d0 = startOfDayLocal(date);
  if (minDate && d0 < startOfDayLocal(minDate)) {
    return { ok: false, kind: DateBound.BeforeMin, bound: minDate };
  }
  if (maxDate && d0 > startOfDayLocal(maxDate)) {
    return { ok: false, kind: DateBound.AfterMax, bound: maxDate };
  }
  return { ok: true };
}

