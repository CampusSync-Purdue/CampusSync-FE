import { useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  createReservation,
  getRoomAvailability,
} from "../../services/reservationService";
import type { Room } from "../../types/room";
import {
  ReservationError,
  type BookedInterval,
  type CreateReservationResponse,
  type ReservationFieldErrors,
} from "../../types/reservation";
import {
  bookingDateRange,
  EMPTY_BOOKING_FORM,
  endTimeOptions,
  hoursForDate,
  pruneSelection,
  startTimeOptions,
  timelineSlots,
  toReservationTimes,
  validateBookingForm,
  type BookingFormValues,
  type TimelineSlot,
} from "../../validation/bookingValidation";
import { campusTimeZoneName, formatTimeLabel, minutesToTime } from "../../utils/campusTime";
import AvailabilityTimeline from "./AvailabilityTimeline";

interface BookingFormProps {
  room: Room;
  onBooked: (result: CreateReservationResponse) => void;
}

type AvailabilityState = {
  date: string;
  status: "idle" | "loading" | "ready" | "error";
  booked: BookedInterval[];
  error: string;
};

const IDLE_AVAILABILITY: AvailabilityState = {
  date: "",
  status: "idle",
  booked: [],
  error: "",
};

const fieldClassName =
  "w-full rounded-md border px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100";

function inputClassName(hasError: boolean) {
  return `${fieldClassName} ${
    hasError ? "border-red-500 bg-red-50" : "border-slate-300"
  }`;
}

function BookingForm({ room, onBooked }: BookingFormProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState<BookingFormValues>(EMPTY_BOOKING_FORM);
  const [fieldErrors, setFieldErrors] = useState<ReservationFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityState>(IDLE_AVAILABILITY);
  // State updates are async, so a fast double-click could submit twice before
  // `submitting` re-renders. The ref blocks the second call synchronously.
  const inFlight = useRef(false);
  // Ignores availability responses for a date the user has since changed.
  const availabilityRequest = useRef(0);

  const { min, max } = bookingDateRange();
  // Booked ranges only apply to the date they were loaded for.
  const booked = useMemo(
    () => (availability.date === values.date ? availability.booked : []),
    [availability, values.date],
  );
  const loadingAvailability =
    availability.status === "loading" && availability.date === values.date;
  const startOptions = useMemo(
    () => startTimeOptions(room.openingHours, values.date, new Date(), booked),
    [room.openingHours, values.date, booked],
  );
  const endOptions = useMemo(
    () => endTimeOptions(room.openingHours, values.date, values.startTime, booked),
    [room.openingHours, values.date, values.startTime, booked],
  );
  const slots = useMemo(
    () => timelineSlots(room.openingHours, values.date, booked),
    [room.openingHours, values.date, booked],
  );
  const dayHours = hoursForDate(room.openingHours, values.date);

  async function handleExpiredSession() {
    // Session expired or invalid: sign out locally and come back here after login.
    await logout().catch(() => undefined);
    navigate("/login", { replace: true, state: { from: location } });
  }

  async function loadAvailability(date: string, { prune = true } = {}) {
    const requestId = ++availabilityRequest.current;

    if (!hoursForDate(room.openingHours, date)) {
      setAvailability({ ...IDLE_AVAILABILITY, date });
      return;
    }

    setAvailability({ date, status: "loading", booked: [], error: "" });

    try {
      const result = await getRoomAvailability(room.id, date);

      if (requestId !== availabilityRequest.current) {
        return;
      }

      setAvailability({ date, status: "ready", booked: result.booked, error: "" });

      if (prune) {
        setValues((current) =>
          current.date === date
            ? pruneSelection(current, room.openingHours, result.booked)
            : current,
        );
      }
    } catch (error) {
      if (requestId !== availabilityRequest.current) {
        return;
      }

      if (error instanceof ReservationError && error.status === 401) {
        await handleExpiredSession();
        return;
      }

      setAvailability({
        date,
        status: "error",
        booked: [],
        error:
          error instanceof ReservationError
            ? error.message
            : "Unable to load this room's availability.",
      });
    }
  }

  function clearErrors(...fields: Array<keyof ReservationFieldErrors>) {
    setFieldErrors((current) => {
      if (!fields.some((field) => current[field])) {
        return current;
      }

      const next = { ...current };
      fields.forEach((field) => delete next[field]);

      return next;
    });
    setFormError("");
  }

  function updateDate(date: string) {
    setValues((current) => {
      // Keep the chosen times only if they are still offered on the new date.
      const starts = startTimeOptions(room.openingHours, date);
      const startTime = starts.includes(current.startTime) ? current.startTime : "";
      const ends = endTimeOptions(room.openingHours, date, startTime);
      const endTime = ends.includes(current.endTime) ? current.endTime : "";

      return { date, startTime, endTime };
    });
    clearErrors("date");
    void loadAvailability(date);
  }

  function updateStartTime(startTime: string) {
    setValues((current) => {
      const ends = endTimeOptions(room.openingHours, current.date, startTime, booked);
      const endTime = ends.includes(current.endTime) ? current.endTime : "";

      return { ...current, startTime, endTime };
    });
    clearErrors("startTime");
  }

  function updateEndTime(endTime: string) {
    setValues((current) => ({ ...current, endTime }));
    clearErrors("endTime");
  }

  /** First click picks the start; a later click on the same run extends the end. */
  function selectSlot(slot: TimelineSlot) {
    setValues((current) => {
      if (current.startTime && current.endTime && slot.start >= current.startTime) {
        const ends = endTimeOptions(room.openingHours, current.date, current.startTime, booked);

        if (ends.includes(slot.end)) {
          return { ...current, endTime: slot.end };
        }
      }

      return { ...current, startTime: slot.start, endTime: slot.end };
    });
    clearErrors("startTime", "endTime");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (inFlight.current || loadingAvailability) {
      return;
    }

    const errors = validateBookingForm(values, room.openingHours, new Date(), booked);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Please correct the highlighted fields.");
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setFieldErrors({});
    setFormError("");

    try {
      const result = await createReservation({
        roomId: room.id,
        ...toReservationTimes(values),
      });

      onBooked(result);
    } catch (error) {
      if (error instanceof ReservationError && error.status === 401) {
        await handleExpiredSession();
        return;
      }

      if (error instanceof ReservationError) {
        // Keep the form values so the user can adjust the time and retry.
        setFieldErrors(error.fieldErrors);
        setFormError(
          error.status === 409
            ? "That time is no longer available. Choose a different time."
            : error.message,
        );

        if (error.status === 409) {
          // Someone else just booked it: show the new red blocks, keep the selection.
          void loadAvailability(values.date, { prune: false });
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const zone = campusTimeZoneName();
  const noTimesLeft =
    availability.status === "ready" &&
    availability.date === values.date &&
    Boolean(dayHours) &&
    startOptions.length === 0;

  return (
    <section aria-labelledby="booking-form-heading" className="rounded-lg bg-white p-8 shadow">
      <h2 id="booking-form-heading" className="mb-2 text-2xl font-bold text-slate-900">
        Book this room
      </h2>

      <p className="mb-6 text-sm text-slate-600">
        Bookings are 30 minutes to 4 hours, up to 30 days ahead. Times are campus
        time ({zone}).
      </p>

      {formError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-red-700">
          {formError}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <div className="mb-4">
          <label htmlFor="booking-date" className="mb-1 block font-medium text-slate-800">
            Date
          </label>
          <input
            id="booking-date"
            name="date"
            type="date"
            min={min}
            max={max}
            value={values.date}
            onChange={(event) => updateDate(event.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.date)}
            aria-describedby={fieldErrors.date ? "booking-date-error" : "booking-date-hint"}
            className={inputClassName(Boolean(fieldErrors.date))}
          />
          {fieldErrors.date ? (
            <p id="booking-date-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.date}
            </p>
          ) : (
            <p id="booking-date-hint" className="mt-1 text-sm text-slate-500">
              {dayHours
                ? `Open ${formatTimeLabel(minutesToTime(dayHours.open))} – ${formatTimeLabel(minutesToTime(dayHours.close))}`
                : values.date
                  ? "This room is closed on that day."
                  : "Choose a date to see available times."}
            </p>
          )}
        </div>

        {dayHours && (
          <div className="mb-4">
            <p className="mb-2 font-medium text-slate-800">Availability</p>

            {loadingAvailability && (
              <p role="status" className="text-sm text-slate-500">
                Loading availability…
              </p>
            )}

            {availability.status === "error" && availability.date === values.date && (
              <div className="flex flex-wrap items-center gap-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                <p role="alert">{availability.error}</p>
                <button
                  type="button"
                  onClick={() => void loadAvailability(values.date)}
                  className="font-medium underline"
                >
                  Try again
                </button>
              </div>
            )}

            {availability.status === "ready" && availability.date === values.date && (
              <>
                <AvailabilityTimeline
                  slots={slots}
                  selectedStart={values.startTime}
                  selectedEnd={values.endTime}
                  disabled={submitting}
                  onSelect={selectSlot}
                />
                <p className="mt-2 text-sm text-slate-500">
                  {noTimesLeft
                    ? "No times left on this day. Choose another date."
                    : "Click a green block to start, then a later block to extend your booking."}
                </p>
              </>
            )}
          </div>
        )}

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="booking-start" className="mb-1 block font-medium text-slate-800">
              Start time
            </label>
            <select
              id="booking-start"
              name="startTime"
              value={values.startTime}
              onChange={(event) => updateStartTime(event.target.value)}
              disabled={submitting || loadingAvailability || startOptions.length === 0}
              aria-invalid={Boolean(fieldErrors.startTime)}
              aria-describedby={fieldErrors.startTime ? "booking-start-error" : undefined}
              className={inputClassName(Boolean(fieldErrors.startTime))}
            >
              <option value="">Select</option>
              {startOptions.map((time) => (
                <option key={time} value={time}>
                  {formatTimeLabel(time)}
                </option>
              ))}
            </select>
            {fieldErrors.startTime && (
              <p id="booking-start-error" className="mt-1 text-sm text-red-600">
                {fieldErrors.startTime}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="booking-end" className="mb-1 block font-medium text-slate-800">
              End time
            </label>
            <select
              id="booking-end"
              name="endTime"
              value={values.endTime}
              onChange={(event) => updateEndTime(event.target.value)}
              disabled={submitting || loadingAvailability || endOptions.length === 0}
              aria-invalid={Boolean(fieldErrors.endTime)}
              aria-describedby={fieldErrors.endTime ? "booking-end-error" : undefined}
              className={inputClassName(Boolean(fieldErrors.endTime))}
            >
              <option value="">Select</option>
              {endOptions.map((time) => (
                <option key={time} value={time}>
                  {formatTimeLabel(time)}
                </option>
              ))}
            </select>
            {fieldErrors.endTime && (
              <p id="booking-end-error" className="mt-1 text-sm text-red-600">
                {fieldErrors.endTime}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || loadingAvailability}
          className="flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting && (
            <span
              aria-hidden="true"
              className="mr-2 size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {submitting ? "Booking…" : "Book room"}
        </button>
      </form>
    </section>
  );
}

export default BookingForm;
