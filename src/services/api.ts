import type { Room } from "../types/room";
import type { GroupedReservations } from "../types/reservation";
import { authHeaders } from "./authToken";
import {
  AvailabilitySearchError,
  type AvailabilityFormValues,
  type AvailabilityResult,
  type ReservationRules,
} from "../types/availability";

const CAMPUS_SYNC_BE_API_BASE_URL =
  import.meta.env.VITE_CAMPUS_SYNC_BE_API_BASE_URL;

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? CAMPUS_SYNC_BE_API_BASE_URL;

export async function getRooms(): Promise<Room[]> {
  const response = await fetch(`${CAMPUS_SYNC_BE_API_BASE_URL}/api/rooms`);

  if (!response.ok) {
    throw new Error("Failed to fetch rooms");
  }

  return response.json();
}

/**
 * Searches rooms a caller could book for a campus-local window (US-06).
 *
 * The date and times are campus-local wall-clock values, which is how a
 * person reads a room's operating hours; the backend converts them to
 * absolute instants.
 *
 * @throws AvailabilitySearchError carrying any per-field messages.
 */
export async function searchRoomAvailability(
  values: AvailabilityFormValues,
): Promise<AvailabilityResult> {
  const query = new URLSearchParams({
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
  });

  const response = await fetch(
    `${CAMPUS_SYNC_BE_API_BASE_URL}/api/rooms/availability?${query}`,
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AvailabilitySearchError(
      body?.message ?? "Unable to search room availability. Please try again.",
      body?.errors ?? {},
    );
  }

  return body as AvailabilityResult;
}

/**
 * Reads the booking rules, so the limit is shown from one source rather than
 * duplicated in the browser (US-10).
 */
export async function getReservationRules(): Promise<ReservationRules> {
  const response = await fetch(
    `${CAMPUS_SYNC_BE_API_BASE_URL}/api/reservations/rules`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch reservation rules");
  }

  return response.json();
}

/**
 * Reads the signed-in user's reservations, split into upcoming and history
 * (US-11).
 *
 * The backend identifies the user from the token, so this never passes a user
 * id: a caller cannot ask for anyone else's bookings.
 */
export async function getMyReservations(): Promise<GroupedReservations> {
  const response = await fetch(
    `${CAMPUS_SYNC_BE_API_BASE_URL}/api/reservations/me`,
    { headers: authHeaders() },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch your bookings");
  }

  return response.json();
}
