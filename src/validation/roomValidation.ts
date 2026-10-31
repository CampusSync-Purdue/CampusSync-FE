import {
  WEEKDAYS,
  type AddRoomFieldErrors,
  type AddRoomFormValues,
  type NewRoomRequest,
} from "../types/adminRoom";
import type { OperatingHours } from "../types/availability";

/** Mirrors the backend limits so the two layers agree on what is valid. */
export const ROOM_NAME_MAX_LENGTH = 120;
export const ROOM_LOCATION_MAX_LENGTH = 120;
export const ROOM_DESCRIPTION_MAX_LENGTH = 1000;
export const ROOM_CAPACITY_MAX = 10_000;

/**
 * Validates the add-room form. Returns a map of field name to message; an
 * empty object means the form is valid. The backend repeats every check.
 */
export function validateAddRoomForm(
  values: AddRoomFormValues,
): AddRoomFieldErrors {
  const errors: AddRoomFieldErrors = {};
  const name = values.name.trim();
  const location = values.location.trim();
  const capacity = values.capacity.trim();

  if (name.length === 0) {
    errors.name = "A room name is required.";
  } else if (name.length > ROOM_NAME_MAX_LENGTH) {
    errors.name = `The name must be ${ROOM_NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (location.length === 0) {
    errors.location = "A location is required.";
  } else if (location.length > ROOM_LOCATION_MAX_LENGTH) {
    errors.location = `The location must be ${ROOM_LOCATION_MAX_LENGTH} characters or fewer.`;
  }

  if (capacity.length === 0) {
    errors.capacity = "A capacity is required.";
  } else if (!/^\d+$/.test(capacity)) {
    errors.capacity = "Capacity must be a whole number.";
  } else if (Number(capacity) < 1) {
    errors.capacity = "Capacity must be at least 1.";
  } else if (Number(capacity) > ROOM_CAPACITY_MAX) {
    errors.capacity = `Capacity must be ${ROOM_CAPACITY_MAX} or fewer.`;
  }

  if (values.description.length > ROOM_DESCRIPTION_MAX_LENGTH) {
    errors.description = `The description must be ${ROOM_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }

  // A room with no published hours is never offered by the availability
  // search, so creating one would add a room nobody could book.
  const openDays = WEEKDAYS.filter((day) => values.hours[day].enabled);

  if (openDays.length === 0) {
    errors.availabilityHours =
      "Choose operating hours for at least one day, or the room can never be booked.";
  } else {
    const incompleteDay = openDays.find(
      (day) => !values.hours[day].open || !values.hours[day].close,
    );

    if (incompleteDay) {
      errors.availabilityHours = `Give ${incompleteDay} both an opening and a closing time.`;
    }
  }

  return errors;
}

/** Splits the comma-separated amenities field into a list. */
export function parseAmenities(amenities: string): string[] {
  return amenities
    .split(",")
    .map((amenity) => amenity.trim())
    .filter((amenity) => amenity.length > 0);
}

/** Builds the request body from the form's values. */
export function toNewRoomRequest(values: AddRoomFormValues): NewRoomRequest {
  const availabilityHours: OperatingHours = {};

  for (const day of WEEKDAYS) {
    const dayHours = values.hours[day];

    if (dayHours.enabled) {
      availabilityHours[day] = { open: dayHours.open, close: dayHours.close };
    }
  }

  return {
    name: values.name.trim(),
    location: values.location.trim(),
    capacity: Number(values.capacity.trim()),
    description: values.description.trim(),
    amenities: parseAmenities(values.amenities),
    availabilityHours,
  };
}
