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
