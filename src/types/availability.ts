import type { Room } from "./room";

/** One day's campus-local opening and closing times, in 24-hour `HH:mm`. */
export type DayOperatingHours = {
  open: string;
  close: string;
};

export type OperatingHours = Partial<Record<string, DayOperatingHours>>;

/** A room offered by the availability search. */
export type AvailableRoom = Room & {
  description: string;
  availabilityHours: OperatingHours;
};

/** The campus-local window a search was run for. */
export type AvailabilityFormValues = {
  date: string;
  startTime: string;
  endTime: string;
};

export const EMPTY_AVAILABILITY_FORM: AvailabilityFormValues = {
  date: "",
  startTime: "",
  endTime: "",
};

/** Field-level messages keyed by form field, matching the backend's shape. */
export type AvailabilityFieldErrors = Partial<
  Record<"date" | "startTime" | "endTime", string>
>;

export type AvailabilityResult = {
  date: string;
  startTime: string;
  endTime: string;
  rooms: AvailableRoom[];
};

/**
 * Thrown for any non-2xx availability response. `fieldErrors` carries the
 * backend's per-field messages so the form can show them inline.
 */
export class AvailabilitySearchError extends Error {
  readonly fieldErrors: AvailabilityFieldErrors;

  constructor(message: string, fieldErrors: AvailabilityFieldErrors = {}) {
    super(message);
    this.name = "AvailabilitySearchError";
    this.fieldErrors = fieldErrors;
  }
}
