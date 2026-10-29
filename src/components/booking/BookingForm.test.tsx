import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BookingForm from "./BookingForm";
import { createReservation, getRoomAvailability } from "../../services/reservationService";
import {
  ReservationError,
  type BookedInterval,
  type CreateReservationResponse,
} from "../../types/reservation";
import type { Room } from "../../types/room";
import { addDays, campusTimeToInstant, campusToday } from "../../utils/campusTime";

vi.mock("../../services/reservationService", () => ({
  createReservation: vi.fn(),
  getRoomAvailability: vi.fn(),
}));

const logoutMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ logout: logoutMock }),
}));

const createReservationMock = vi.mocked(createReservation);
const getRoomAvailabilityMock = vi.mocked(getRoomAvailability);

const room: Room = {
  id: "2f6b1c4e-8a3d-4f5b-9c71-0d2e3a4b5c01",
  name: "Study Room 101",
  location: "Library",
  capacity: 8,
  amenities: ["WiFi"],
  openingHours: Object.fromEntries(
    ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map(
      (day) => [day, { open: "08:00", close: "20:00" }],
    ),
  ),
};

const tomorrow = addDays(campusToday(), 1);

const success: CreateReservationResponse = {
  message: "Your reservation is confirmed.",
  reservation: {
    id: "r1",
    roomId: room.id,
    roomName: room.name,
    roomLocation: room.location,
    userId: "u1",
    startTime: "2026-10-27T14:00:00.000Z",
    endTime: "2026-10-27T15:00:00.000Z",
    status: "active",
    createdAt: "2026-10-26T12:00:00.000Z",
  },
};

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from;

  return <p>Login page, from {from?.pathname}</p>;
}

function renderForm(onBooked = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[`/rooms/${room.id}`]}>
      <Routes>
        <Route path="/rooms/:roomId" element={<BookingForm room={room} onBooked={onBooked} />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  );

  return onBooked;
}

function bookedAt(start: string, end: string): BookedInterval {
  return {
    startTime: campusTimeToInstant(tomorrow, start).toISOString(),
    endTime: campusTimeToInstant(tomorrow, end).toISOString(),
  };
}

function availabilityWith(booked: BookedInterval[]) {
  return {
    roomId: room.id,
    date: tomorrow,
    timeZone: "America/Indiana/Indianapolis",
    openingHours: { open: "08:00", close: "20:00" },
    booked,
  };
}

/** Picks tomorrow and waits for its availability to load. */
async function chooseTomorrow() {
  fireEvent.change(screen.getByLabelText("Date"), { target: { value: tomorrow } });
  await screen.findByRole("group", { name: "Availability by half hour" });
}

function selectValues(label: string): string[] {
  return Array.from((screen.getByLabelText(label) as HTMLSelectElement).options)
    .map((option) => option.value)
    .filter(Boolean);
}

async function fillValidBooking(user: ReturnType<typeof userEvent.setup>) {
  await chooseTomorrow();
  await user.selectOptions(screen.getByLabelText("Start time"), "10:00");
  await user.selectOptions(screen.getByLabelText("End time"), "11:00");
}

function submitButton() {
  return screen.getByRole("button", { name: /book room|booking/i });
}

beforeEach(() => {
  createReservationMock.mockReset();
  getRoomAvailabilityMock.mockReset();
  getRoomAvailabilityMock.mockResolvedValue(availabilityWith([]));
  logoutMock.mockClear();
});

describe("BookingForm", () => {
  it("shows validation messages and does not call the API for an empty form", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(submitButton());

    expect(screen.getByRole("alert").textContent).toBe("Please correct the highlighted fields.");
    expect(screen.getByText("Choose a date.")).toBeTruthy();
    expect(screen.getByLabelText("Date").getAttribute("aria-invalid")).toBe("true");
    expect(createReservationMock).not.toHaveBeenCalled();
  });

  it("limits end times to 4 hours after the chosen start", async () => {
    const user = userEvent.setup();
    renderForm();

    await chooseTomorrow();
    await user.selectOptions(screen.getByLabelText("Start time"), "10:00");

    const endValues = selectValues("End time");

    expect(endValues.at(0)).toBe("10:30");
    expect(endValues.at(-1)).toBe("14:00");
  });

  it("loads availability for the chosen date", async () => {
    renderForm();

    await chooseTomorrow();

    expect(getRoomAvailabilityMock).toHaveBeenCalledWith(room.id, tomorrow);
    // 08:00 to 20:00 in 30-minute blocks.
    expect(screen.getAllByRole("button", { name: /available$/ })).toHaveLength(24);
  });

  it("shows booked blocks in red and keeps them out of the time lists", async () => {
    const user = userEvent.setup();
    getRoomAvailabilityMock.mockResolvedValue(availabilityWith([bookedAt("10:00", "11:00")]));
    renderForm();

    await chooseTomorrow();

    const bookedBlock = screen.getByRole("button", { name: "10:00 AM to 10:30 AM, booked" });
    expect((bookedBlock as HTMLButtonElement).disabled).toBe(true);
    expect(bookedBlock.className).toContain("bg-red-500");
    expect(screen.getByRole("button", { name: "10:30 AM to 11:00 AM, booked" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "11:00 AM to 11:30 AM, available" }).className).toContain(
      "bg-green-500",
    );

    expect(selectValues("Start time")).not.toContain("10:00");
    expect(selectValues("Start time")).not.toContain("10:30");

    // A booking starting at 9:00 has to end before the 10:00 reservation.
    await user.selectOptions(screen.getByLabelText("Start time"), "09:00");
    expect(selectValues("End time")).toEqual(["09:30", "10:00"]);
  });

  it("shows the user's own bookings in purple, separate from others' bookings", async () => {
    getRoomAvailabilityMock.mockResolvedValue(
      availabilityWith([
        { ...bookedAt("10:00", "11:00"), isMine: true },
        { ...bookedAt("12:00", "12:30"), isMine: false },
      ]),
    );
    renderForm();

    await chooseTomorrow();

    const mine = screen.getByRole("button", { name: "10:00 AM to 10:30 AM, your booking" });
    expect((mine as HTMLButtonElement).disabled).toBe(true);
    expect(mine.className).toContain("bg-purple-500");
    expect(screen.getByRole("button", { name: "12:00 PM to 12:30 PM, booked" }).className).toContain(
      "bg-red-500",
    );
    expect(screen.getByText("Your booking")).toBeTruthy();
  });

  it("selects a range by clicking green blocks", async () => {
    const user = userEvent.setup();
    renderForm();

    await chooseTomorrow();

    await user.click(screen.getByRole("button", { name: "1:00 PM to 1:30 PM, available" }));
    expect((screen.getByLabelText("Start time") as HTMLSelectElement).value).toBe("13:00");
    expect((screen.getByLabelText("End time") as HTMLSelectElement).value).toBe("13:30");

    await user.click(screen.getByRole("button", { name: "2:30 PM to 3:00 PM, available" }));
    expect((screen.getByLabelText("End time") as HTMLSelectElement).value).toBe("15:00");
    expect(screen.getAllByRole("button", { name: /selected$/ })).toHaveLength(4);
  });

  it("starts a new selection when a later click would pass a booking", async () => {
    const user = userEvent.setup();
    getRoomAvailabilityMock.mockResolvedValue(availabilityWith([bookedAt("14:00", "14:30")]));
    renderForm();

    await chooseTomorrow();

    await user.click(screen.getByRole("button", { name: "1:00 PM to 1:30 PM, available" }));
    await user.click(screen.getByRole("button", { name: "3:00 PM to 3:30 PM, available" }));

    expect((screen.getByLabelText("Start time") as HTMLSelectElement).value).toBe("15:00");
    expect((screen.getByLabelText("End time") as HTMLSelectElement).value).toBe("15:30");
  });

  it("offers a retry when availability cannot be loaded", async () => {
    const user = userEvent.setup();
    getRoomAvailabilityMock.mockRejectedValueOnce(
      new ReservationError("Unable to load this room's availability.", 500),
    );
    renderForm();

    fireEvent.change(screen.getByLabelText("Date"), { target: { value: tomorrow } });

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Unable to load this room's availability.",
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("group", { name: "Availability by half hour" })).toBeTruthy();
    expect(getRoomAvailabilityMock).toHaveBeenCalledTimes(2);
  });

  it("submits the campus times as ISO timestamps and reports success", async () => {
    const user = userEvent.setup();
    createReservationMock.mockResolvedValue(success);
    const onBooked = renderForm();

    await fillValidBooking(user);
    await user.click(submitButton());

    await waitFor(() => expect(onBooked).toHaveBeenCalledWith(success));

    const request = createReservationMock.mock.calls[0][0];
    expect(request.roomId).toBe(room.id);
    expect(request.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/);
    expect(new Date(request.endTime).getTime() - new Date(request.startTime).getTime()).toBe(
      60 * 60_000,
    );
  });

  it("sends only one request when submit is clicked repeatedly", async () => {
    const user = userEvent.setup();
    let resolve: (value: CreateReservationResponse) => void = () => undefined;
    createReservationMock.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    renderForm();

    await fillValidBooking(user);

    const form = submitButton().closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(createReservationMock).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(submitButton().textContent).toBe("Booking…"));
    expect((submitButton() as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Date") as HTMLInputElement).disabled).toBe(true);

    resolve(success);
    await waitFor(() => expect(submitButton().textContent).toBe("Book room"));
  });

  it("keeps the chosen times and explains a conflict", async () => {
    const user = userEvent.setup();
    createReservationMock.mockRejectedValue(
      new ReservationError("This room is already booked.", 409, {
        startTime: "This room is already booked.",
      }),
    );
    renderForm();

    await fillValidBooking(user);
    await user.click(submitButton());

    expect((await screen.findByRole("alert")).textContent).toBe(
      "That time is no longer available. Choose a different time.",
    );
    expect(screen.getByText("This room is already booked.")).toBeTruthy();
    expect((screen.getByLabelText("Date") as HTMLInputElement).value).toBe(tomorrow);
    expect((screen.getByLabelText("Start time") as HTMLSelectElement).value).toBe("10:00");
    expect((screen.getByLabelText("End time") as HTMLSelectElement).value).toBe("11:00");
    // Availability is reloaded so the newly taken slot turns red.
    await waitFor(() => expect(getRoomAvailabilityMock).toHaveBeenCalledTimes(2));
  });

  it("signs out and returns to login when the session has expired", async () => {
    const user = userEvent.setup();
    createReservationMock.mockRejectedValue(new ReservationError("Session expired.", 401));
    renderForm();

    await fillValidBooking(user);
    await user.click(submitButton());

    expect(await screen.findByText(`Login page, from /rooms/${room.id}`)).toBeTruthy();
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it("shows a general message for other failures", async () => {
    const user = userEvent.setup();
    createReservationMock.mockRejectedValue(
      new ReservationError("Unable to reach the server.", 0),
    );
    renderForm();

    await fillValidBooking(user);
    await user.click(submitButton());

    expect((await screen.findByRole("alert")).textContent).toBe("Unable to reach the server.");
  });
});
