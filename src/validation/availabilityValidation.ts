import type {
  AvailabilityFieldErrors,
  AvailabilityFormValues,
} from "../types/availability";

/** Mirrors the backend patterns so the two layers agree on what is valid. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validates the availability search form. Returns a map of field name to
 * message; an empty object means the form is valid.
 *
 * The backend repeats every check and additionally rejects times that
 * daylight saving makes nonexistent or ambiguous, which needs the campus time
 * zone. This exists to give immediate feedback, not to be the only guard.
 */
export function validateAvailabilityForm(
  values: AvailabilityFormValues,
): AvailabilityFieldErrors {
  const errors: AvailabilityFieldErrors = {};
  const date = values.date.trim();
  const startTime = values.startTime.trim();
  const endTime = values.endTime.trim();

  if (date.length === 0) {
    errors.date = "A date is required.";
  } else if (!DATE_PATTERN.test(date)) {
    errors.date = "Enter the date as YYYY-MM-DD.";
  }

  if (startTime.length === 0) {
    errors.startTime = "A start time is required.";
  } else if (!TIME_PATTERN.test(startTime)) {
    errors.startTime = "Enter the start time as HH:mm.";
  }

  if (endTime.length === 0) {
    errors.endTime = "An end time is required.";
  } else if (!TIME_PATTERN.test(endTime)) {
    errors.endTime = "Enter the end time as HH:mm.";
  }

  // Both are zero-padded 24-hour values, so text order is clock order.
  if (!errors.startTime && !errors.endTime && endTime <= startTime) {
    errors.endTime = "The end time must be after the start time.";
  }

  return errors;
}

/**
 * Minutes between two campus-local `HH:mm` values on the same date.
 *
 * This reads the wall clock, which is right for a live warning as someone
 * picks times. It can differ from elapsed time across a daylight saving
 * transition, so the server measures the real elapsed time between instants
 * and remains the authority on the limit.
 */
export function durationMinutes(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  return endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
}

/** A sentence naming the limit, matching how the backend phrases it. */
export function describeMaxDuration(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;

    return hours === 1 ? "1 hour" : `${hours} hours`;
  }

  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}
