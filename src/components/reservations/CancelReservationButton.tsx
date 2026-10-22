import { useState } from "react";
import { cancelReservation } from "../../services/api";
import {
  CancelReservationError,
  type Reservation,
} from "../../types/reservation";

type CancelReservationButtonProps = {
  reservation: Reservation;
  /** Called with the cancelled reservation so the list can refresh its row. */
  onCancelled: (reservation: Reservation) => void;
};

/**
 * The administrator cancellation action (US-16).
 *
 * Cancelling cannot be undone, so the action asks for confirmation inline
 * rather than acting on the first click. The confirmation is rendered in the
 * page instead of a browser dialog, so it is reachable by keyboard and does
 * not block the page.
 *
 * Only an upcoming active reservation can be cancelled; for anything else the
 * action is not offered, and the backend refuses it regardless.
 */
export function CancelReservationButton({
  reservation,
  onCancelled,
}: CancelReservationButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  if (reservation.status !== "active") {
    return null;
  }

  async function handleCancel() {
    setCancelling(true);
    setError("");

    try {
      const result = await cancelReservation(reservation.id);

      onCancelled(result.reservation);
    } catch (caught) {
      setError(
        caught instanceof CancelReservationError
          ? caught.message
          : "Unable to cancel the reservation. Please try again.",
      );
      setConfirming(false);
    } finally {
      setCancelling(false);
    }
  }

  if (!confirming) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded border border-red-300 px-3 py-1 text-sm font-medium text-red-700 transition hover:bg-red-50"
        >
          Cancel reservation
        </button>

        {error ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm text-slate-700">
        Cancel this reservation for {reservation.room.name}? This cannot be
        undone.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className="rounded bg-red-700 px-3 py-1 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-60"
        >
          {cancelling ? "Cancelling..." : "Yes, cancel it"}
        </button>

        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={cancelling}
          className="rounded border border-slate-300 px-3 py-1 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
