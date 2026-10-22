import { useEffect, useState } from "react";
import { getMyReservations } from "../services/api";
import {
  formatCampusDate,
  formatCampusTimeRange,
} from "../utils/dateTime";
import type {
  GroupedReservations,
  Reservation,
  ReservationStatus,
} from "../types/reservation";

const STATUS_LABELS: Record<ReservationStatus, string> = {
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_CLASSES: Record<ReservationStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-800",
};

function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function BookingCard({ reservation }: { reservation: Reservation }) {
  return (
    <li className="rounded-lg bg-white p-6 shadow">
      <div className="mb-2 flex items-start justify-between gap-4">
        <h3 className="text-xl font-semibold text-slate-900">
          {reservation.room.name}
        </h3>

        <StatusBadge status={reservation.status} />
      </div>

      <p className="mb-1 text-slate-600">
        Location: {reservation.room.location}
      </p>

      <p className="mb-1 text-slate-600">
        {formatCampusDate(reservation.startTime)}
      </p>

      <p className="text-slate-600">
        {formatCampusTimeRange(reservation.startTime, reservation.endTime)}
      </p>
    </li>
  );
}

function BookingSection({
  title,
  reservations,
  emptyMessage,
}: {
  title: string;
  reservations: Reservation[];
  emptyMessage: string;
}) {
  return (
    <section aria-label={title} className="mb-10">
      <h2 className="mb-4 text-2xl font-semibold text-slate-900">{title}</h2>

      {reservations.length === 0 ? (
        <p className="text-slate-600">{emptyMessage}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reservations.map((reservation) => (
            <BookingCard key={reservation.id} reservation={reservation} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * My Bookings (US-11).
 *
 * Shows only the signed-in user's reservations, split into what is still
 * ahead and what is finished or called off. The status on each card is the
 * one the backend derived, so this page and the administrator view agree.
 */
function MyBookingsPage() {
  const [reservations, setReservations] = useState<GroupedReservations | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReservations() {
      try {
        setReservations(await getMyReservations());
      } catch {
        setError("Unable to load your bookings. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadReservations();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">My Bookings</h1>

      {loading ? <p className="text-slate-600">Loading your bookings...</p> : null}

      {error ? (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      ) : null}

      {reservations ? (
        <>
          <BookingSection
            title="Upcoming"
            reservations={reservations.upcoming}
            emptyMessage="You have no upcoming bookings."
          />

          <BookingSection
            title="History"
            reservations={reservations.past}
            emptyMessage="You have no past bookings."
          />
        </>
      ) : null}
    </main>
  );
}

export default MyBookingsPage;
