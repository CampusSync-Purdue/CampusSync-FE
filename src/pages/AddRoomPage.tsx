import { useState } from "react";
import { createRoom } from "../services/api";
import {
  toNewRoomRequest,
  validateAddRoomForm,
} from "../validation/roomValidation";
import TimeSelect from "../components/common/TimeSelect";
import {
  CreateRoomError,
  EMPTY_ADD_ROOM_FORM,
  WEEKDAYS,
  type AddRoomFieldErrors,
  type AddRoomFormValues,
  type Weekday,
} from "../types/adminRoom";

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

function dayLabel(day: Weekday): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/**
 * Add a room (US-13).
 *
 * Administrators only; the route is guarded by role and the backend enforces
 * it again. Name, location, capacity, and operating hours are all required —
 * a room with no published hours would never be offered by the availability
 * search, so it could never be booked.
 */
function AddRoomPage() {
  const [values, setValues] = useState<AddRoomFormValues>(EMPTY_ADD_ROOM_FORM);
  const [fieldErrors, setFieldErrors] = useState<AddRoomFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(
    field: Exclude<keyof AddRoomFormValues, "hours">,
    value: string,
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSuccessMessage("");
  }

  function updateDay(day: Weekday, changes: Partial<AddRoomFormValues["hours"][Weekday]>) {
    setValues((current) => ({
      ...current,
      hours: { ...current.hours, [day]: { ...current.hours[day], ...changes } },
    }));
    setFieldErrors((current) => ({ ...current, availabilityHours: undefined }));
    setSuccessMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateAddRoomForm(values);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("");
      setSuccessMessage("");

      return;
    }

    setSaving(true);
    setFieldErrors({});
    setFormError("");

    try {
      const result = await createRoom(toNewRoomRequest(values));

      setSuccessMessage(`${result.room.name} has been added to the catalog.`);
      // Clear the form so the next room starts from a blank slate.
      setValues(EMPTY_ADD_ROOM_FORM);
    } catch (error) {
      setSuccessMessage("");

      if (error instanceof CreateRoomError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError("Unable to create the room. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Add a Room</h1>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Add a room"
        className="max-w-3xl rounded-lg bg-white p-6 shadow"
      >
        <div className="mb-4">
          <label htmlFor="room-name" className="mb-1 block font-medium text-slate-800">
            Name
          </label>

          <input
            id="room-name"
            name="name"
            type="text"
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            className={FIELD_CLASSES}
          />

          <FieldError message={fieldErrors.name} />
        </div>

        <div className="mb-4">
          <label
            htmlFor="room-location"
            className="mb-1 block font-medium text-slate-800"
          >
            Location
          </label>

          <input
            id="room-location"
            name="location"
            type="text"
            value={values.location}
            onChange={(event) => updateField("location", event.target.value)}
            aria-invalid={Boolean(fieldErrors.location)}
            className={FIELD_CLASSES}
          />

          <FieldError message={fieldErrors.location} />
        </div>

        <div className="mb-4">
          <label
            htmlFor="room-capacity"
            className="mb-1 block font-medium text-slate-800"
          >
            Capacity
          </label>

          <input
            id="room-capacity"
            name="capacity"
            type="number"
            min={1}
            value={values.capacity}
            onChange={(event) => updateField("capacity", event.target.value)}
            aria-invalid={Boolean(fieldErrors.capacity)}
            className={FIELD_CLASSES}
          />

          <FieldError message={fieldErrors.capacity} />
        </div>

        <div className="mb-4">
          <label
            htmlFor="room-description"
            className="mb-1 block font-medium text-slate-800"
          >
            Description <span className="text-slate-500">(optional)</span>
          </label>

          <textarea
            id="room-description"
            name="description"
            rows={3}
            value={values.description}
            onChange={(event) => updateField("description", event.target.value)}
            aria-invalid={Boolean(fieldErrors.description)}
            className={FIELD_CLASSES}
          />

          <FieldError message={fieldErrors.description} />
        </div>

        <div className="mb-6">
          <label
            htmlFor="room-amenities"
            className="mb-1 block font-medium text-slate-800"
          >
            Amenities <span className="text-slate-500">(comma separated, optional)</span>
          </label>

          <input
            id="room-amenities"
            name="amenities"
            type="text"
            value={values.amenities}
            onChange={(event) => updateField("amenities", event.target.value)}
            placeholder="WiFi, Whiteboard"
            className={FIELD_CLASSES}
          />

          <FieldError message={fieldErrors.amenities} />
        </div>

        <fieldset className="mb-6">
          <legend className="mb-2 font-medium text-slate-800">
            Operating hours
          </legend>

          <p className="mb-3 text-sm text-slate-600">
            Choose the days this room opens. Times are campus local time.
          </p>

          <div className="space-y-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="flex flex-wrap items-center gap-3">
                <label className="flex w-36 items-center gap-2 text-slate-800">
                  <input
                    type="checkbox"
                    checked={values.hours[day].enabled}
                    onChange={(event) =>
                      updateDay(day, { enabled: event.target.checked })
                    }
                    aria-label={`Open on ${dayLabel(day)}`}
                  />
                  {dayLabel(day)}
                </label>

                <label className="sr-only" htmlFor={`${day}-open`}>
                  {dayLabel(day)} opening time
                </label>

                <TimeSelect
                  id={`${day}-open`}
                  value={values.hours[day].open}
                  disabled={!values.hours[day].enabled}
                  onChange={(value) => updateDay(day, { open: value })}
                  className="rounded border border-slate-300 bg-white px-2 py-1 disabled:bg-slate-100 disabled:text-slate-400"
                />

                <span className="text-slate-500">to</span>

                <label className="sr-only" htmlFor={`${day}-close`}>
                  {dayLabel(day)} closing time
                </label>

                <TimeSelect
                  id={`${day}-close`}
                  value={values.hours[day].close}
                  disabled={!values.hours[day].enabled}
                  onChange={(value) => updateDay(day, { close: value })}
                  className="rounded border border-slate-300 bg-white px-2 py-1 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            ))}
          </div>

          <FieldError message={fieldErrors.availabilityHours} />
        </fieldset>

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-900 px-5 py-2 font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add room"}
        </button>

        {successMessage ? (
          <p role="status" className="mt-4 text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        {formError ? (
          <p role="alert" className="mt-4 text-red-600">
            {formError}
          </p>
        ) : null}
      </form>
    </main>
  );
}

export default AddRoomPage;
