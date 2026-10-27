import { Link } from "react-router-dom";
import type { ReservationConfirmation } from "../../types/reservation";
import {
  campusTimeZoneName,
  formatCampusDate,
  formatCampusTime,
} from "../../utils/campusTime";

interface BookingConfirmationProps {
  reservation: ReservationConfirmation;
  message: string;
  onBookAnother: () => void;
}

const STATUS_LABELS: Record<ReservationConfirmation["status"], string> = {
  active: "Active",
  cancelled: "Cancelled",
  completed: "Completed",
};

function BookingConfirmation({
  reservation,
  message,
  onBookAnother,
}: BookingConfirmationProps) {
  const zone = campusTimeZoneName(new Date(reservation.startTime));

  return (
    <section
      aria-labelledby="booking-confirmation-heading"
      className="rounded-lg bg-white p-8 shadow"
    >
      <h2
        id="booking-confirmation-heading"
        className="mb-2 text-2xl font-bold text-slate-900"
      >
        Booking confirmed
      </h2>

      <p role="status" className="mb-6 text-green-700">
        {message}
      </p>

      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-slate-700">
        <dt className="font-semibold text-slate-900">Room</dt>
        <dd>{reservation.roomName}</dd>

        <dt className="font-semibold text-slate-900">Location</dt>
        <dd>{reservation.roomLocation}</dd>

        <dt className="font-semibold text-slate-900">Date</dt>
        <dd>{formatCampusDate(reservation.startTime)}</dd>

        <dt className="font-semibold text-slate-900">Time</dt>
        <dd>
          {formatCampusTime(reservation.startTime)} –{" "}
          {formatCampusTime(reservation.endTime)} {zone}
        </dd>

        <dt className="font-semibold text-slate-900">Status</dt>
        <dd>{STATUS_LABELS[reservation.status]}</dd>
      </dl>

      <div className="mt-8 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={onBookAnother}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          Book another time
        </button>

        <Link
          to="/rooms"
          className="rounded-md px-4 py-2 text-sm font-medium text-blue-600 hover:underline"
        >
          Back to rooms
        </Link>
      </div>
    </section>
  );
}

export default BookingConfirmation;
