import type { OpeningHours } from "../types/room";
import type { BookedInterval, ReservationFieldErrors } from "../types/reservation";
import {
  addDays,
  campusTimeToInstant,
  campusToday,
  minutesToTime,
  timeToMinutes,
  weekdayOf,
} from "../utils/campusTime";

// Mirrors the backend rules in CampusSync-BE/src/validation/reservationValidation.ts.
export const BOOKING_INCREMENT_MINUTES = 30;
export const BOOKING_MIN_MINUTES = 30;
export const BOOKING_MAX_MINUTES = 4 * 60;
export const BOOKING_MAX_DAYS_AHEAD = 30;

export type BookingFormValues = {
  date: string;
  startTime: string;
  endTime: string;
};

export const EMPTY_BOOKING_FORM: BookingFormValues = {
  date: "",
  startTime: "",
  endTime: "",
};

/** "mine" is a block the signed-in user already booked; it is not selectable either. */
export type SlotState = "available" | "booked" | "mine" | "past";

/** One 30-minute block of the availability timeline. Times are campus "HH:mm". */
export type TimelineSlot = {
  start: string;
  end: string;
  state: SlotState;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function bookingDateRange(now: Date = new Date()) {
  const min = campusToday(now);

  return { min, max: addDays(min, BOOKING_MAX_DAYS_AHEAD) };
}

/** Opening hours for the given date, in minutes, or null when closed. */
export function hoursForDate(
  openingHours: OpeningHours,
  date: string,
): { open: number; close: number } | null {
  if (!DATE_PATTERN.test(date)) {
    return null;
  }

  const hours = openingHours[weekdayOf(date)];

  if (!hours) {
    return null;
  }

  const open = timeToMinutes(hours.open);
  const close = timeToMinutes(hours.close);

  return Number.isNaN(open) || Number.isNaN(close) || close <= open
    ? null
    : { open, close };
}

/** Booked ranges that overlap [start, end) on `date` (campus minutes). */
function overlappingBookings(
  date: string,
  startMinutes: number,
  endMinutes: number,
  booked: BookedInterval[],
): BookedInterval[] {
  if (booked.length === 0) {
    return [];
  }

  const start = campusTimeToInstant(date, minutesToTime(startMinutes)).getTime();
  const end = campusTimeToInstant(date, minutesToTime(endMinutes)).getTime();

  return booked.filter(
    (slot) => Date.parse(slot.startTime) < end && Date.parse(slot.endTime) > start,
  );
}

function overlapsBooked(
  date: string,
  startMinutes: number,
  endMinutes: number,
  booked: BookedInterval[],
): boolean {
  return overlappingBookings(date, startMinutes, endMinutes, booked).length > 0;
}

function isPast(date: string, minutes: number, now: Date): boolean {
  return campusTimeToInstant(date, minutesToTime(minutes)).getTime() <= now.getTime();
}

/**
 * The day's 30-minute blocks from opening to closing, each marked available,
 * booked, or past. Past wins over booked: neither can be chosen, and past
 * bookings are not useful to show.
 */
export function timelineSlots(
  openingHours: OpeningHours,
  date: string,
  booked: BookedInterval[],
  now: Date = new Date(),
): TimelineSlot[] {
  const hours = hoursForDate(openingHours, date);

  if (!hours) {
    return [];
  }

  const slots: TimelineSlot[] = [];

  for (
    let minutes = hours.open;
    minutes + BOOKING_INCREMENT_MINUTES <= hours.close;
    minutes += BOOKING_INCREMENT_MINUTES
  ) {
    const end = minutes + BOOKING_INCREMENT_MINUTES;
    const overlaps = overlappingBookings(date, minutes, end, booked);
    let state: SlotState = "available";

    if (isPast(date, minutes, now)) {
      state = "past";
    } else if (overlaps.some((slot) => !slot.isMine)) {
      state = "booked";
    } else if (overlaps.length > 0) {
      state = "mine";
    }

    slots.push({ start: minutesToTime(minutes), end: minutesToTime(end), state });
  }

  return slots;
}

/**
 * Bookable start times ("HH:mm") on `date`: 30-minute steps from opening
 * until the last slot that still fits the minimum length, skipping times that
 * have passed or whose first 30 minutes are already booked.
 */
export function startTimeOptions(
  openingHours: OpeningHours,
  date: string,
  now: Date = new Date(),
  booked: BookedInterval[] = [],
): string[] {
  const hours = hoursForDate(openingHours, date);

  if (!hours) {
    return [];
  }

  const options: string[] = [];

  for (
    let minutes = hours.open;
    minutes + BOOKING_MIN_MINUTES <= hours.close;
    minutes += BOOKING_INCREMENT_MINUTES
  ) {
    if (
      !isPast(date, minutes, now) &&
      !overlapsBooked(date, minutes, minutes + BOOKING_MIN_MINUTES, booked)
    ) {
      options.push(minutesToTime(minutes));
    }
  }

  return options;
}

/**
 * End times ("HH:mm") allowed after `startTime`: 30 minutes to 4 hours,
 * before closing, and stopping at the next booked block.
 */
export function endTimeOptions(
  openingHours: OpeningHours,
  date: string,
  startTime: string,
  booked: BookedInterval[] = [],
): string[] {
  const hours = hoursForDate(openingHours, date);
  const start = timeToMinutes(startTime);

  if (!hours || Number.isNaN(start)) {
    return [];
  }

  const latest = Math.min(start + BOOKING_MAX_MINUTES, hours.close);
  const options: string[] = [];

  for (
    let minutes = start + BOOKING_MIN_MINUTES;
    minutes <= latest;
    minutes += BOOKING_INCREMENT_MINUTES
  ) {
    if (overlapsBooked(date, minutes - BOOKING_INCREMENT_MINUTES, minutes, booked)) {
      break;
    }

    options.push(minutesToTime(minutes));
  }

  return options;
}

/** Drops a chosen start or end time that is no longer available. */
export function pruneSelection(
  values: BookingFormValues,
  openingHours: OpeningHours,
  booked: BookedInterval[],
  now: Date = new Date(),
): BookingFormValues {
  const startTime = startTimeOptions(openingHours, values.date, now, booked).includes(
    values.startTime,
  )
    ? values.startTime
    : "";
  const endTime =
    startTime &&
    endTimeOptions(openingHours, values.date, startTime, booked).includes(values.endTime)
      ? values.endTime
      : "";

  return startTime === values.startTime && endTime === values.endTime
    ? values
    : { ...values, startTime, endTime };
}

/** Client-side checks mirroring the backend, so most mistakes never reach the API. */
export function validateBookingForm(
  values: BookingFormValues,
  openingHours: OpeningHours,
  now: Date = new Date(),
  booked: BookedInterval[] = [],
): ReservationFieldErrors {
  const errors: ReservationFieldErrors = {};
  const { min, max } = bookingDateRange(now);

  if (!values.date) {
    errors.date = "Choose a date.";
  } else if (!DATE_PATTERN.test(values.date)) {
    errors.date = "Enter a valid date.";
  } else if (values.date < min) {
    errors.date = "Choose today or a later date.";
  } else if (values.date > max) {
    errors.date = `Reservations can be made up to ${BOOKING_MAX_DAYS_AHEAD} days in advance.`;
  } else if (!hoursForDate(openingHours, values.date)) {
    errors.date = "This room is closed on that day.";
  }

  if (!values.startTime) {
    errors.startTime = "Choose a start time.";
  } else if (
    !errors.date &&
    !startTimeOptions(openingHours, values.date, now, booked).includes(values.startTime)
  ) {
    errors.startTime = "Choose an available start time.";
  }

  if (!values.endTime) {
    errors.endTime = "Choose an end time.";
  } else if (
    !errors.date &&
    !errors.startTime &&
    !endTimeOptions(openingHours, values.date, values.startTime, booked).includes(
      values.endTime,
    )
  ) {
    errors.endTime =
      "Choose an end time 30 minutes to 4 hours after the start, before closing and before the next booking.";
  }

  return errors;
}

/** Converts form values to the API's ISO timestamps. */
export function toReservationTimes(values: BookingFormValues) {
  return {
    startTime: campusTimeToInstant(values.date, values.startTime).toISOString(),
    endTime: campusTimeToInstant(values.date, values.endTime).toISOString(),
  };
}
