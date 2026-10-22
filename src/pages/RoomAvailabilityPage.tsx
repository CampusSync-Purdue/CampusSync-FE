import { useState } from "react";
import { Link } from "react-router-dom";
import { searchRoomAvailability } from "../services/api";
import { validateAvailabilityForm } from "../validation/availabilityValidation";
import {
  AvailabilitySearchError,
  EMPTY_AVAILABILITY_FORM,
  type AvailabilityFieldErrors,
  type AvailabilityFormValues,
  type AvailabilityResult,
} from "../types/availability";

const FIELD_CLASSES =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p role="alert" className="mt-1 text-sm text-red-600">
      {message}
    </p>
  );
}

/**
 * Room availability search (US-06).
 *
 * A caller picks a date and a start and end time, and sees only the rooms
 * they could actually book for that window. An empty result is a real answer
 * rather than a failure, so it gets its own message instead of an error.
 */
function RoomAvailabilityPage() {
  const [values, setValues] = useState<AvailabilityFormValues>(
    EMPTY_AVAILABILITY_FORM,
  );
  const [fieldErrors, setFieldErrors] = useState<AvailabilityFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [searching, setSearching] = useState(false);

  function updateField(field: keyof AvailabilityFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear the message for the field being corrected, so it does not linger
    // while the user is still typing.
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateAvailabilityForm(values);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("");
      setResult(null);

      return;
    }

    setSearching(true);
    setFieldErrors({});
    setFormError("");

    try {
      setResult(await searchRoomAvailability(values));
    } catch (error) {
      setResult(null);

      if (error instanceof AvailabilitySearchError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError("Unable to search room availability. Please try again.");
      }
    } finally {
      setSearching(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">
        Search Room Availability
      </h1>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Search room availability"
        className="mb-8 max-w-3xl rounded-lg bg-white p-6 shadow"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="availability-date"
              className="mb-1 block font-medium text-slate-800"
            >
              Date
            </label>

            <input
              id="availability-date"
              name="date"
              type="date"
              value={values.date}
              onChange={(event) => updateField("date", event.target.value)}
              aria-invalid={Boolean(fieldErrors.date)}
              className={FIELD_CLASSES}
            />

            <FieldError message={fieldErrors.date} />
          </div>

          <div>
            <label
              htmlFor="availability-start-time"
              className="mb-1 block font-medium text-slate-800"
            >
              Start time
            </label>

            <input
              id="availability-start-time"
              name="startTime"
              type="time"
              value={values.startTime}
              onChange={(event) => updateField("startTime", event.target.value)}
              aria-invalid={Boolean(fieldErrors.startTime)}
              className={FIELD_CLASSES}
            />

            <FieldError message={fieldErrors.startTime} />
          </div>

          <div>
            <label
              htmlFor="availability-end-time"
              className="mb-1 block font-medium text-slate-800"
            >
              End time
            </label>

            <input
              id="availability-end-time"
              name="endTime"
              type="time"
              value={values.endTime}
              onChange={(event) => updateField("endTime", event.target.value)}
              aria-invalid={Boolean(fieldErrors.endTime)}
              className={FIELD_CLASSES}
            />

            <FieldError message={fieldErrors.endTime} />
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-600">
          Times are campus local time.
        </p>

        <button
          type="submit"
          disabled={searching}
          className="mt-4 rounded bg-slate-900 px-5 py-2 font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {searching ? "Searching..." : "Search"}
        </button>

        {formError ? (
          <p role="alert" className="mt-4 text-red-600">
            {formError}
          </p>
        ) : null}
      </form>

      {result ? (
        <section aria-label="Availability results">
          <h2 className="mb-4 text-2xl font-semibold text-slate-900">
            Rooms available {result.date} from {result.startTime} to{" "}
            {result.endTime}
          </h2>

          {result.rooms.length === 0 ? (
            <p className="text-slate-600">
              No rooms are available for the time you chose. Try a different
              date or time.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {result.rooms.map((room) => (
                <Link
                  key={room.id}
                  to={`/rooms/${room.id}`}
                  className="block rounded-lg bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <h3 className="mb-2 text-xl font-semibold text-slate-900">
                    {room.name}
                  </h3>

                  <p className="mb-2 text-slate-600">
                    Location: {room.location}
                  </p>

                  <p className="mb-2 text-slate-600">
                    Capacity: {room.capacity}
                  </p>

                  {room.amenities.length > 0 ? (
                    <ul className="list-inside list-disc text-slate-600">
                      {room.amenities.map((amenity) => (
                        <li key={amenity}>{amenity}</li>
                      ))}
                    </ul>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}

export default RoomAvailabilityPage;
