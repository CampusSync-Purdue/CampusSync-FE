import { useEffect, useState } from "react";
import { CancelReservationButton } from "../components/reservations/CancelReservationButton";
import { cancelMyReservation, getMyReservations } from "../services/api";
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

type BookingCardProps = {
  reservation: Reservation;
  onCancelled?: (reservation: Reservation) => void;
};

function BookingCard({
  reservation,
  onCancelled,
}: BookingCardProps) {
  const canCancel =
    reservation.status === "active" &&
    reservation.timeframe === "upcoming" &&
    new Date(reservation.startTime).getTime() > Date.now();

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
        {formatCampusTimeRange(
          reservation.startTime,
          reservation.endTime,
        )}
      </p>

      {canCancel && onCancelled ? (
        <div className="mt-4">
          <CancelReservationButton
            reservation={reservation}
            cancelAction={cancelMyReservation}
            onCancelled={onCancelled}
          />
        </div>
      ) : null}
    </li>
  );
}

type BookingSectionProps = {
  title: string;
  reservations: Reservation[];
  emptyMessage: string;
  onCancelled?: (reservation: Reservation) => void;
};

function BookingSection({
  title,
  reservations,
  emptyMessage,
  onCancelled,
}: BookingSectionProps) {
  return (
    <section aria-label={title} className="mb-10">
      <h2 className="mb-4 text-2xl font-semibold text-slate-900">
        {title}
      </h2>

      {reservations.length === 0 ? (
        <p className="text-slate-600">{emptyMessage}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reservations.map((reservation) => (
            <BookingCard
              key={reservation.id}
              reservation={reservation}
              onCancelled={onCancelled}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * My Bookings (US-11 / US-12).
 *
 * Displays the authenticated user's upcoming and past reservations.
 *
 * CSYNC-21 adds cancellation for upcoming active reservations.
 * After a successful cancellation, the booking is moved from Upcoming
 * to History and its status is updated to Cancelled.
 */
function MyBookingsPage() {
  const [reservations, setReservations] =
    useState<GroupedReservations | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  /**
   * Called only after the backend confirms that cancellation succeeded.
   *
   * Updates the displayed reservations immediately without requiring
   * the user to refresh the page.
   */
  function handleCancelled(cancelledReservation: Reservation) {
    setReservations((current) => {
      if (!current) {
        return current;
      }

      return {
        upcoming: current.upcoming.filter(
          (reservation) => reservation.id !== cancelledReservation.id,
        ),
        past: [
          cancelledReservation,
          ...current.past.filter(
            (reservation) => reservation.id !== cancelledReservation.id,
          ),
        ],
      };
    });

    setSuccessMessage(
      `Your reservation for ${cancelledReservation.room.name} has been cancelled.`,
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">
        My Bookings
      </h1>

      {loading ? (
        <p className="text-slate-600">Loading your bookings...</p>
      ) : null}

      {error ? (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      ) : null}

      {successMessage ? (
        <p
          role="status"
          className="mb-6 rounded-lg bg-emerald-100 p-4 text-emerald-800"
        >
          {successMessage}
        </p>
      ) : null}

      {reservations ? (
        <>
          <BookingSection
            title="Upcoming"
            reservations={reservations.upcoming}
            emptyMessage="You have no upcoming bookings."
            onCancelled={handleCancelled}
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