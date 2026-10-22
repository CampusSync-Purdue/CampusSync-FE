import type { Room } from "../types/room";
import {
  CancelReservationError,
  type CancelReservationSuccess,
  type GroupedReservations,
} from "../types/reservation";
import { authHeaders } from "./authToken";
import {
  CreateRoomError,
  type CreateRoomSuccess,
  type NewRoomRequest,
} from "../types/adminRoom";
import {
  AvailabilitySearchError,
  type AvailabilityFormValues,
  type AvailabilityResult,
  type ReservationRules,
} from "../types/availability";

/**
 * The backend origin, without a path: every call appends its own `/api/...`
 * route. VITE_API_BASE_URL stays supported as an override so existing local
 * setups keep working, but VITE_CAMPUS_SYNC_BE_API_BASE_URL is the documented
 * name.
 *
 * There used to be two constants here with the same value but different
 * meanings, and sign-in read the one that had no `/api` prefix applied, so
 * every login request 404ed.
 */
export const API_BASE_URL =
  import.meta.env.VITE_CAMPUS_SYNC_BE_API_BASE_URL ??
  import.meta.env.VITE_API_BASE_URL;

export async function getRooms(): Promise<Room[]> {
  const response = await fetch(`${API_BASE_URL}/api/rooms`);

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
    `${API_BASE_URL}/api/rooms/availability?${query}`,
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
    `${API_BASE_URL}/api/reservations/rules`,
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
    `${API_BASE_URL}/api/reservations/me`,
    { headers: authHeaders() },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch your bookings");
  }

  return response.json();
}

/**
 * Creates a room (US-13). Administrators only; the backend enforces that and
 * answers 403 for anyone else.
 *
 * @throws CreateRoomError carrying any per-field messages.
 */
export async function createRoom(
  room: NewRoomRequest,
): Promise<CreateRoomSuccess> {
  const response = await fetch(`${API_BASE_URL}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(room),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new CreateRoomError(
      body?.message ?? "Unable to create the room. Please try again.",
      body?.errors ?? {},
    );
  }

  return body as CreateRoomSuccess;
}

/**
 * Reads every reservation, for administrators (US-15).
 *
 * Provisional: CSYNC-24 owns the administrator reservation view. This exists
 * so the cancellation action has something to act on.
 */
export async function getAllReservations(): Promise<GroupedReservations> {
  const response = await fetch(
    `${API_BASE_URL}/api/reservations`,
    { headers: authHeaders() },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch reservations");
  }

  return response.json();
}

/**
 * Cancels a reservation as an administrator (US-16). The record is kept and
 * its status becomes cancelled.
 *
 * @throws CancelReservationError with the backend's message.
 */
export async function cancelReservation(
  reservationId: string,
): Promise<CancelReservationSuccess> {
  const response = await fetch(
    `${API_BASE_URL}/api/reservations/${reservationId}/cancel`,
    { method: "POST", headers: authHeaders() },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new CancelReservationError(
      body?.message ?? "Unable to cancel the reservation. Please try again.",
    );
  }

  return body as CancelReservationSuccess;
}
