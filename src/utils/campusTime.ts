/**
 * Campus-local date and time helpers. Opening hours and booking rules are
 * defined in campus time, whatever the browser's own time zone is.
 */
export const CAMPUS_TIMEZONE: string =
  import.meta.env.VITE_CAMPUS_TIMEZONE || "America/Indiana/Indianapolis";

export const DAYS_OF_WEEK = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export type ZonedDateTime = {
  /** YYYY-MM-DD */
  date: string;
  /** Minutes since local midnight. */
  minutes: number;
};

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    partsFormatters.set(timeZone, formatter);
  }

  return formatter;
}

export function toZonedDateTime(
  instant: Date,
  timeZone: string = CAMPUS_TIMEZONE,
): ZonedDateTime {
  const parts = Object.fromEntries(
    partsFormatter(timeZone)
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** Today's date on campus, YYYY-MM-DD. */
export function campusToday(now: Date = new Date()): string {
  return toZonedDateTime(now).date;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/** Weekday of a YYYY-MM-DD calendar date. */
export function weekdayOf(date: string): DayOfWeek {
  const [year, month, day] = date.split("-").map(Number);

  return DAYS_OF_WEEK[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/** "HH:mm" → minutes since midnight; NaN when malformed. */
export function timeToMinutes(time: string): number {
  const match = /^([01]\d|2[0-4]):([0-5]\d)$/.exec(time);

  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
}

export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;
}

/** "13:30" → "1:30 PM" */
export function formatTimeLabel(time: string): string {
  const minutes = timeToMinutes(time);
  const hours24 = Math.floor(minutes / 60) % 24;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `${hours12}:${String(minutes % 60).padStart(2, "0")} ${suffix}`;
}

/** Converts a campus wall-clock date and time to an instant. */
export function campusTimeToInstant(
  date: string,
  time: string,
  timeZone: string = CAMPUS_TIMEZONE,
): Date {
  const [year, month, day] = date.split("-").map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day) + timeToMinutes(time) * 60_000;
  let guess = wallClockAsUtc;

  // Correct by the zone offset; the second pass settles DST edges.
  for (let pass = 0; pass < 2; pass += 1) {
    const zoned = toZonedDateTime(new Date(guess), timeZone);
    const [zy, zm, zd] = zoned.date.split("-").map(Number);

    guess += wallClockAsUtc - (Date.UTC(zy, zm - 1, zd) + zoned.minutes * 60_000);
  }

  return new Date(guess);
}

/** e.g. "Tuesday, October 27, 2026" in campus time. */
export function formatCampusDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CAMPUS_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

/** e.g. "10:00 AM" in campus time. */
export function formatCampusTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CAMPUS_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Short zone name, e.g. "EDT", for labelling times. */
export function campusTimeZoneName(instant: Date = new Date()): string {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: CAMPUS_TIMEZONE,
    timeZoneName: "short",
  })
    .formatToParts(instant)
    .find((item) => item.type === "timeZoneName");

  return part?.value ?? CAMPUS_TIMEZONE;
}
