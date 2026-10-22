/**
 * Campus-local display formatting.
 *
 * Reservation times are shown in the campus time zone rather than whatever
 * the browser happens to be set to, per the backend's
 * `docs/date-time-conventions.md` section 4. A student travelling over a
 * break should still see the time the room is actually booked for.
 */
export const CAMPUS_TIME_ZONE = "America/Indiana/Indianapolis";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: CAMPUS_TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const TIME_WITH_ZONE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: CAMPUS_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: CAMPUS_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

/** For example, "Wed, Oct 21, 2026". */
export function formatCampusDate(isoTimestamp: string): string {
  return DATE_FORMAT.format(new Date(isoTimestamp));
}

/** For example, "2:00 PM EDT". */
export function formatCampusTime(isoTimestamp: string): string {
  return TIME_WITH_ZONE_FORMAT.format(new Date(isoTimestamp));
}

/**
 * A reservation's window on one line, for example "2:00 PM - 4:00 PM EDT".
 * The zone is named once, on the end, because both instants share it.
 */
export function formatCampusTimeRange(
  startIso: string,
  endIso: string,
): string {
  return `${TIME_FORMAT.format(new Date(startIso))} – ${formatCampusTime(endIso)}`;
}
