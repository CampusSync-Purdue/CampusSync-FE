/** The status a reservation is shown with. See the backend's status model. */
export type ReservationStatus = "active" | "cancelled" | "completed";

/** Which section of the My Bookings page a reservation belongs to. */
export type ReservationTimeframe = "upcoming" | "past";

export type ReservationRoom = {
  id: string;
  name: string;
  location: string;
  capacity: number;
};

export type Reservation = {
  id: string;
  userId: string;
  /** ISO 8601 UTC instant. */
  startTime: string;
  /** ISO 8601 UTC instant. */
  endTime: string;
  status: ReservationStatus;
  timeframe: ReservationTimeframe;
  createdAt: string;
  updatedAt: string;
  room: ReservationRoom;
};

/** The two sections the My Bookings page renders. */
export type GroupedReservations = {
  upcoming: Reservation[];
  past: Reservation[];
};

export type CancelReservationSuccess = {
  message: string;
  reservation: Reservation;
};

/** Thrown for any non-2xx cancellation response. */
export class CancelReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CancelReservationError";
  }
}

/* ---- Booking flow (room-reservations) ---- */

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
