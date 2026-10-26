const MINUTES_IN_DAY = 24 * 60;

/**
 * How far apart the offered times are. Half-hour slots keep the list short
 * enough to scan while still covering how rooms are actually booked.
 */
export const TIME_STEP_MINUTES = 30;

/** Zero-padded `HH:mm`, the same shape the API sends and receives. */
function toTimeValue(minutesFromMidnight: number): string {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Every `HH:mm` value on the grid, from 00:00 up to the end of the day. */
export function timeOptions(stepMinutes: number = TIME_STEP_MINUTES): string[] {
  const options: string[] = [];

  for (let minutes = 0; minutes < MINUTES_IN_DAY; minutes += stepMinutes) {
    options.push(toTimeValue(minutes));
  }

  return options;
}

/**
 * The 12-hour reading of a `HH:mm` value, e.g. `14:30` as `2:30 PM`.
 *
 * Only the label changes: the value behind it stays 24-hour, so nothing
 * downstream has to parse "PM".
 */
export function formatTimeLabel(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return value;
  }

  const period = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}
