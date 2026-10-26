import { useEffect, useState } from "react";
import { getAllReservations } from "../services/api";
import { CancelReservationButton } from "../components/reservations/CancelReservationButton";
import { formatCampusDate, formatCampusTimeRange } from "../utils/dateTime";
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

/**
 * Administrator reservation management (US-16).
 *
 * Deliberately thin: US-15 (CSYNC-24) owns this view and will want filtering,
 * paging, and the booking's owner. This exists so the cancellation action has
 * a home, and should be folded into that view when it lands.
 */
function AdminReservationsPage() {
  const [reservations, setReservations] = useState<GroupedReservations | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReservations() {
      try {
        setReservations(await getAllReservations());
      } catch {
        setError("Unable to load reservations. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadReservations();
  }, []);

  /**
   * Moves a just-cancelled reservation out of the upcoming list and into
   * history, so the page reflects the new status without a reload.
   */
  function handleCancelled(cancelled: Reservation) {
    setReservations((current) => {
      if (!current) {
        return current;
      }

      return {
        upcoming: current.upcoming.filter(
          (reservation) => reservation.id !== cancelled.id,
        ),
        past: [cancelled, ...current.past],
      };
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">
        Manage Reservations
      </h1>

      {loading ? (
        <p className="text-slate-600">Loading reservations...</p>
      ) : null}

      {error ? (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      ) : null}

      {reservations ? (
        <>
          <section aria-label="Upcoming" className="mb-10">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Upcoming
            </h2>

            {reservations.upcoming.length === 0 ? (
              <p className="text-slate-600">There are no upcoming reservations.</p>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {reservations.upcoming.map((reservation) => (
                  <li
                    key={reservation.id}
                    className="rounded-lg bg-white p-6 shadow"
                  >
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {reservation.room.name}
                      </h3>

                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_CLASSES[reservation.status]}`}
                      >
                        {STATUS_LABELS[reservation.status]}
                      </span>
                    </div>

                    <p className="mb-1 text-slate-600">
                      Location: {reservation.room.location}
                    </p>

                    <p className="mb-1 text-slate-600">
                      {formatCampusDate(reservation.startTime)}
                    </p>

                    <p className="mb-4 text-slate-600">
                      {formatCampusTimeRange(
                        reservation.startTime,
                        reservation.endTime,
                      )}
                    </p>

                    <CancelReservationButton
                      reservation={reservation}
                      onCancelled={handleCancelled}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="History">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              History
            </h2>

            {reservations.past.length === 0 ? (
              <p className="text-slate-600">There are no past reservations.</p>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {reservations.past.map((reservation) => (
                  <li
                    key={reservation.id}
                    className="rounded-lg bg-white p-6 shadow"
                  >
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {reservation.room.name}
                      </h3>

                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_CLASSES[reservation.status]}`}
                      >
                        {STATUS_LABELS[reservation.status]}
                      </span>
                    </div>

                    <p className="text-slate-600">
                      {formatCampusDate(reservation.startTime)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

export default AdminReservationsPage;
