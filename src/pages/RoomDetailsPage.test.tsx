
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RoomDetailsPage from "./RoomDetailsPage";
import { getReservationRules, getRooms } from "../services/api";
import {
  createReservation,
  getRoomAvailability,
} from "../services/reservationService";
import type { Room } from "../types/room";
import type { CreateReservationResponse } from "../types/reservation";
import {
  addDays,
  campusTimeToInstant,
  campusToday,
} from "../utils/campusTime";

vi.mock("../services/api", () => ({
  getRooms: vi.fn(),
  getReservationRules: vi.fn(),
}));

vi.mock("../services/reservationService", () => ({
  createReservation: vi.fn(),
  getRoomAvailability: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}));

const getRoomsMock = vi.mocked(getRooms);
const getRulesMock = vi.mocked(getReservationRules);
const createReservationMock = vi.mocked(createReservation);
const getAvailabilityMock = vi.mocked(getRoomAvailability);

const tomorrow = addDays(campusToday(), 1);

const room: Room = {
  id: "2f6b1c4e-8a3d-4f5b-9c71-0d2e3a4b5c01",
  name: "Study Room 101",
  location: "Library",
  capacity: 8,
  amenities: ["WiFi", "Whiteboard"],
  openingHours: {
    sunday: { open: "08:00", close: "20:00" },
    monday: { open: "08:00", close: "20:00" },
    tuesday: { open: "08:00", close: "20:00" },
    wednesday: { open: "08:00", close: "20:00" },
    thursday: { open: "08:00", close: "20:00" },
    friday: { open: "08:00", close: "20:00" },
    saturday: { open: "08:00", close: "20:00" },
  },
};

const bookingStart = campusTimeToInstant(
  tomorrow,
  "10:00",
).toISOString();

const bookingEnd = campusTimeToInstant(
  tomorrow,
  "11:00",
).toISOString();

const success: CreateReservationResponse = {
  message: "Your reservation is confirmed.",
  reservation: {
    id: "7c4a8180-1111-4222-8333-54f0d51ad900",
    roomId: room.id,
    roomName: room.name,
    roomLocation: room.location,
    userId: "fbc978c8-1111-4222-8333-54f0d51ad900",
    startTime: bookingStart,
    endTime: bookingEnd,
    status: "active",
    createdAt: new Date().toISOString(),
  },
};

function availabilityWith(
  booked: Array<{
    startTime: string;
    endTime: string;
    isMine?: boolean;
  }>,
) {
  return {
    roomId: room.id,
    date: tomorrow,
    timeZone: "America/Indiana/Indianapolis",
    openingHours: { open: "08:00", close: "20:00" },
    booked,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/rooms/${room.id}`]}>
      <Routes>
        <Route
          path="/rooms/:roomId"
          element={<RoomDetailsPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  getRoomsMock.mockResolvedValue([room]);
  getRulesMock.mockResolvedValue({
    maxDurationMinutes: 180,
  });

  // First request: the room is free.
  getAvailabilityMock.mockResolvedValueOnce(
    availabilityWith([]),
  );

  // Second request: the reservation now occupies the slot.
  getAvailabilityMock.mockResolvedValue(
    availabilityWith([
      {
        startTime: bookingStart,
        endTime: bookingEnd,
        isMine: true,
      },
    ]),
  );

  createReservationMock.mockResolvedValue(success);
});

describe("RoomDetailsPage booking refresh (CSYNC-18)", () => {
  it("restores the booking date and reloads availability after success", async () => {
    const user = userEvent.setup();

    renderPage();

    // Load the room details.
    expect(
      await screen.findByRole("heading", {
        name: room.name,
      }),
    ).toBeTruthy();

    // Choose tomorrow and load initial availability.
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: tomorrow },
    });

    await screen.findByRole("group", {
      name: "Availability by half hour",
    });

    expect(getAvailabilityMock).toHaveBeenCalledWith(
      room.id,
      tomorrow,
    );

    // Select a valid one-hour reservation.
    fireEvent.change(screen.getByLabelText("Start time"), {
      target: { value: "10:00" },
    });

    fireEvent.change(screen.getByLabelText("End time"), {
      target: { value: "11:00" },
    });

    // Submit the reservation.
    await user.click(
      screen.getByRole("button", {
        name: "Book room",
      }),
    );

    // Confirm that booking succeeded.
    expect(
      await screen.findByRole("heading", {
        name: "Booking confirmed",
      }),
    ).toBeTruthy();

    expect(createReservationMock).toHaveBeenCalledTimes(1);

    // Reopen the form for another reservation.
    await user.click(
      screen.getByRole("button", {
        name: "Book another time",
      }),
    );

    // CSYNC-18: The previous date should still be selected.
    const dateInput = screen.getByLabelText(
      "Date",
    ) as HTMLInputElement;

    expect(dateInput.value).toBe(tomorrow);

    // CSYNC-18: Reopening should trigger a fresh availability request.
    await waitFor(() => {
      expect(getAvailabilityMock).toHaveBeenCalledTimes(2);
    });

    expect(getAvailabilityMock).toHaveBeenLastCalledWith(
      room.id,
      tomorrow,
    );

    // The newly booked slot should be marked as occupied.
    const bookedSlot = await screen.findByRole("button", {
      name: "10:00 AM to 10:30 AM, your booking",
    });

    expect(
      (bookedSlot as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
