import { useEffect, useState } from "react";
import { getAllReservations, getRooms } from "../services/api";
import { CancelReservationButton } from "../components/reservations/CancelReservationButton";
import { formatCampusDate, formatCampusTimeRange } from "../utils/dateTime";
import type {
  AdminReservation,
  AdminReservationSortField,
  Reservation,
  ReservationStatus,
  SortOrder,
} from "../types/reservation";
import type { Room } from "../types/room";

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

const FIELD_CLASSES =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none";

/** The direction a column sorts in when it is first chosen. */
const INITIAL_ORDER: Record<AdminReservationSortField, SortOrder> = {
  date: "desc",
  room: "asc",
  status: "asc",
};

type LoadResult =
  | { key: string; reservations: AdminReservation[] }
  | { key: string; error: string };

/**
 * Administrator reservation management (CSYNC-24 / US-15, with the US-16
 * cancellation action).
 *
 * Filtering and sorting are done by the backend, so the table stays correct
 * however many reservations exist. Each result is tagged with the query that
 * produced it; a response for an older query is ignored, and the page is
 * "loading" whenever the latest result does not match the current query.
 */
function AdminReservationsPage() {
  const [date, setDate] = useState("");
  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState<ReservationStatus | "">("");
  const [sort, setSort] = useState<AdminReservationSortField>("date");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  const queryKey = JSON.stringify({ date, roomId, status, sort, order, attempt });
  const loading = result?.key !== queryKey;
  const hasFilters = Boolean(date || roomId || status);

  useEffect(() => {
    let ignore = false;

    getAllReservations({ date, roomId, status, sort, order })
      .then((reservations) => {
        if (!ignore) {
          setResult({ key: queryKey, reservations });
        }
      })
      .catch((caught: unknown) => {
        if (!ignore) {
          setResult({
            key: queryKey,
            error:
              caught instanceof Error && caught.message
                ? caught.message
                : "Unable to load reservations. Please try again.",
          });
        }
      });

    return () => {
      ignore = true;
    };
    // queryKey is derived from every other dependency listed here.
  }, [queryKey, date, roomId, status, sort, order]);

  useEffect(() => {
    // The room filter is a convenience: if rooms cannot be loaded, the list
    // still works and the filter offers only "All rooms".
    getRooms()
      .then((loaded) =>
        setRooms([...loaded].sort((a, b) => a.name.localeCompare(b.name))),
      )
      .catch(() => setRooms([]));
  }, []);

  function handleSort(field: AdminReservationSortField) {
    if (field === sort) {
      setOrder(order === "asc" ? "desc" : "asc");
      return;
    }

    setSort(field);
    setOrder(INITIAL_ORDER[field]);
  }

  function clearFilters() {
    setDate("");
    setRoomId("");
    setStatus("");
  }

  /** Updates the cancelled row in place, keeping its user details. */
  function handleCancelled(cancelled: Reservation) {
    setResult((current) => {
      if (!current || !("reservations" in current)) {
        return current;
      }

      return {
        ...current,
        reservations: current.reservations.map((reservation) =>
          reservation.id === cancelled.id
            ? {
                ...reservation,
                status: cancelled.status,
                timeframe: cancelled.timeframe,
                updatedAt: cancelled.updatedAt,
              }
            : reservation,
        ),
      };
    });
  }

  function ariaSort(field: AdminReservationSortField) {
    if (field !== sort) {
      return "none" as const;
    }

    return order === "asc" ? ("ascending" as const) : ("descending" as const);
  }

  /** A sortable column header. A plain function, not a component, so it is not remounted on every render. */
  function renderSortHeader(field: AdminReservationSortField, label: string) {
    const arrow = field === sort ? (order === "asc" ? "▲" : "▼") : "";

    return (
      <th scope="col" aria-sort={ariaSort(field)} className="px-4 py-3">
        <button
          type="button"
          onClick={() => handleSort(field)}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
        >
          {label}
          <span aria-hidden="true" className="text-xs">
            {arrow}
          </span>
        </button>
      </th>
    );
  }

  const reservations =
    !loading && result && "reservations" in result ? result.reservations : null;
  const error = !loading && result && "error" in result ? result.error : "";

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">
        Manage Reservations
      </h1>

      <section
        aria-label="Filters"
        className="mb-6 rounded-lg bg-white p-6 shadow"
      >
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label
              htmlFor="filter-date"
              className="mb-1 block font-medium text-slate-800"
            >
              Date
            </label>
            <input
              id="filter-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={FIELD_CLASSES}
            />
          </div>

          <div>
            <label
              htmlFor="filter-room"
              className="mb-1 block font-medium text-slate-800"
            >
              Room
            </label>
            <select
              id="filter-room"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              className={FIELD_CLASSES}
            >
              <option value="">All rooms</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-status"
              className="mb-1 block font-medium text-slate-800"
            >
              Status
            </label>
            <select
              id="filter-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ReservationStatus | "")
              }
              className={FIELD_CLASSES}
            >
              <option value="">All statuses</option>
              {(Object.keys(STATUS_LABELS) as ReservationStatus[]).map(
                (value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="rounded border border-slate-300 px-5 py-2 font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <p role="status" className="text-slate-600">
          Loading reservations...
        </p>
      ) : null}

      {error ? (
        <div role="alert" className="text-red-600">
          <p className="mb-2">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((count) => count + 1)}
            className="rounded border border-red-300 px-3 py-1 text-sm font-medium text-red-700 transition hover:bg-red-50"
          >
            Try again
          </button>
        </div>
      ) : null}

      {reservations && reservations.length === 0 ? (
        <p className="text-slate-600">
          {hasFilters
            ? "No reservations match these filters."
            : "There are no reservations yet."}
        </p>
      ) : null}

      {reservations && reservations.length > 0 ? (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">All reservations</caption>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-700">
                  Reserved by
                </th>
                {renderSortHeader("room", "Room")}
                {renderSortHeader("date", "Date")}
                <th scope="col" className="px-4 py-3 font-semibold text-slate-700">
                  Time
                </th>
                {renderSortHeader("status", "Status")}
                <th scope="col" className="px-4 py-3 font-semibold text-slate-700">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reservations.map((reservation) => (
                <tr key={reservation.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {reservation.user.name}
                    </p>
                    <p className="text-slate-600">{reservation.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {reservation.room.name}
                    </p>
                    <p className="text-slate-600">{reservation.room.location}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-800">
                    {formatCampusDate(reservation.startTime)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-800">
                    {formatCampusTimeRange(
                      reservation.startTime,
                      reservation.endTime,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASSES[reservation.status]}`}
                    >
                      {STATUS_LABELS[reservation.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CancelReservationButton
                      reservation={reservation}
                      onCancelled={handleCancelled}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}

export default AdminReservationsPage;
