import { useState } from "react";
import { cancelReservation } from "../../services/api";
import {
  CancelReservationError,
  type Reservation,
} from "../../types/reservation";

type CancelReservationButtonProps = {
  reservation: Reservation;

  /** Called after a successful cancellation. */
  onCancelled: (reservation: Reservation) => void;

  /**
   * Cancellation API function.
   * Defaults to the administrator endpoint for backward compatibility.
   */
  cancelAction?: typeof cancelReservation;
};

/**
 * Reusable reservation cancellation action.
 *
 * Administrators use cancelReservation (US-16).
 * Regular users can supply cancelMyReservation (US-12 / CSYNC-21).
 *
 * Cancellation requires confirmation before sending a request.
 * The backend enforces ownership and reservation eligibility.
 */
export function CancelReservationButton({
  reservation,
  onCancelled,
  cancelAction = cancelReservation,
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
      const result = await cancelAction(reservation.id);

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