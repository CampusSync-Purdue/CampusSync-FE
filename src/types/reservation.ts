export type ReservationStatus = "active" | "cancelled" | "completed";

/** Body for POST /api/reservations. Times are ISO 8601 with an offset. */
export type CreateReservationRequest = {
  roomId: string;
  startTime: string;
  endTime: string;
};

/** Returned by the backend after a reservation is created. Times are UTC ISO strings. */
export type ReservationConfirmation = {
  id: string;
  roomId: string;
  roomName: string;
  roomLocation: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  createdAt: string;
};

export type CreateReservationResponse = {
  message: string;
  reservation: ReservationConfirmation;
};

export type ReservationFieldErrors = Partial<
  Record<"roomId" | "date" | "startTime" | "endTime", string>
>;

/**
 * Thrown for any failed create-reservation request. `status` is the HTTP
 * status (0 for network failures) so the UI can react to 401 and 409.
 */
export class ReservationError extends Error {
  readonly status: number;
  readonly fieldErrors: ReservationFieldErrors;

  constructor(
    message: string,
    status: number,
    fieldErrors: ReservationFieldErrors = {},
  ) {
    super(message);
    this.name = "ReservationError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** A booked time range for a room. Times are UTC ISO strings. */
export type BookedInterval = {
  startTime: string;
  endTime: string;
  /** True when the signed-in user made this reservation. */
  isMine?: boolean;
};

/** GET /api/rooms/:roomId/availability?date=YYYY-MM-DD */
export type RoomAvailability = {
  roomId: string;
  date: string;
  timeZone: string;
  openingHours: { open: string; close: string } | null;
  booked: BookedInterval[];
};
