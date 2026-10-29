import { getAuthToken } from "./authToken";
import {
  ReservationError,
  type CreateReservationRequest,
  type CreateReservationResponse,
  type ReservationFieldErrors,
  type RoomAvailability,
} from "../types/reservation";

const CAMPUS_SYNC_BE_API_BASE_URL =
  import.meta.env.VITE_CAMPUS_SYNC_BE_API_BASE_URL;

const GENERIC_ERROR_MESSAGE =
  "Unable to create your reservation right now. Please try again.";

function readFieldErrors(errors: unknown): ReservationFieldErrors {
  if (!errors || typeof errors !== "object") {
    return {};
  }

  const fieldErrors: ReservationFieldErrors = {};

  for (const field of ["roomId", "date", "startTime", "endTime"] as const) {
    const message = (errors as Record<string, unknown>)[field];

    if (typeof message === "string" && message.length > 0) {
      fieldErrors[field] = message;
    }
  }

  return fieldErrors;
}

/**
 * Sends an authenticated JSON request. Throws a ReservationError carrying
 * the HTTP status (0 for network failures) and any per-field messages.
 */
async function authenticatedRequest<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  const token = getAuthToken();

  if (!token) {
    throw new ReservationError("Please sign in to book a room.", 401);
  }

  let response: Response;

  try {
    response = await fetch(`${CAMPUS_SYNC_BE_API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new ReservationError(
      "Unable to reach the server. Check your connection and try again.",
      0,
    );
  }

  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
    errors?: unknown;
  } | null;

  if (!response.ok) {
    const message =
      typeof body?.message === "string" && body.message.length > 0
        ? body.message
        : fallbackMessage;

    throw new ReservationError(
      message,
      response.status,
      readFieldErrors(body?.errors),
    );
  }

  return body as unknown as T;
}

/** Reserves a room for the signed-in user. */
export function createReservation(
  payload: CreateReservationRequest,
): Promise<CreateReservationResponse> {
  return authenticatedRequest<CreateReservationResponse>(
    "/api/reservations",
    { method: "POST", body: JSON.stringify(payload) },
    GENERIC_ERROR_MESSAGE,
  );
}

/** Opening hours and booked time ranges for a room on a campus date (YYYY-MM-DD). */
export function getRoomAvailability(
  roomId: string,
  date: string,
): Promise<RoomAvailability> {
  return authenticatedRequest<RoomAvailability>(
    `/api/rooms/${encodeURIComponent(roomId)}/availability?date=${encodeURIComponent(date)}`,
    { method: "GET" },
    "Unable to load this room's availability. Please try again.",
  );
}
