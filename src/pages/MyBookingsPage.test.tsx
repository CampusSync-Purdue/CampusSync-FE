import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MyBookingsPage from "./MyBookingsPage";

import {
  cancelMyReservation,
  getMyReservations,
} from "../services/api";

import {
  CancelReservationError,
  type Reservation,
} from "../types/reservation";

vi.mock("../services/api", () => ({
  getMyReservations: vi.fn(),
  cancelMyReservation: vi.fn(),
}));

const getMock = vi.mocked(getMyReservations);
const cancelMock = vi.mocked(cancelMyReservation);

function reservation(
  overrides: Partial<Reservation> = {},
): Reservation {
  return {
    id: "res-1",
    userId: "user-1",

    // 18:00Z is 2:00 PM EDT in the campus time zone.
    startTime: "2026-10-21T18:00:00.000Z",
    endTime: "2026-10-21T20:00:00.000Z",

    status: "active",
    timeframe: "upcoming",

    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",

    room: {
      id: "room-1",
      name: "Study Room 101",
      location: "Library",
      capacity: 8,
    },

    ...overrides,
  };
}

/**
 * A reservation safely in the future.
 *
 * Using a future date keeps cancellation tests independent
 * of the day on which the test suite runs.
 */
function upcomingReservation(): Reservation {
  return reservation({
    id: "future-res-1",
    startTime: "2090-01-01T15:00:00.000Z",
    endTime: "2090-01-01T16:00:00.000Z",
    status: "active",
    timeframe: "upcoming",
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/my-bookings"]}>
      <MyBookingsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MyBookingsPage", () => {
  describe("displaying reservations", () => {
    it("shows an upcoming booking in the upcoming section", async () => {
      getMock.mockResolvedValue({
        upcoming: [reservation()],
        past: [],
      });

      renderPage();

      const upcoming = await screen.findByRole("region", {
        name: "Upcoming",
      });

      expect(
        within(upcoming).getByText("Study Room 101"),
      ).toBeTruthy();

      expect(
        within(upcoming).getByText(/Location: Library/),
      ).toBeTruthy();

      expect(
        within(upcoming).getByText("Active"),
      ).toBeTruthy();
    });

    it("shows the date and time in campus local time", async () => {
      getMock.mockResolvedValue({
        upcoming: [reservation()],
        past: [],
      });

      renderPage();

      expect(
        await screen.findByText(/Wed, Oct 21, 2026/),
      ).toBeTruthy();

      // 18:00Z to 20:00Z is 2:00 PM to 4:00 PM EDT.
      expect(
        screen.getByText(/2:00\s*PM.*4:00\s*PM\s*EDT/),
      ).toBeTruthy();
    });

    it("shows a completed booking in history", async () => {
      getMock.mockResolvedValue({
        upcoming: [],
        past: [
          reservation({
            id: "res-2",
            status: "completed",
            timeframe: "past",
          }),
        ],
      });

      renderPage();

      const history = await screen.findByRole("region", {
        name: "History",
      });

      expect(
        within(history).getByText("Completed"),
      ).toBeTruthy();
    });

    it("shows a cancelled booking in history", async () => {
      getMock.mockResolvedValue({
        upcoming: [],
        past: [
          reservation({
            id: "res-3",
            status: "cancelled",
            timeframe: "past",
          }),
        ],
      });

      renderPage();

      const history = await screen.findByRole("region", {
        name: "History",
      });

      expect(
        within(history).getByText("Cancelled"),
      ).toBeTruthy();
    });

    it("distinguishes cancelled from completed", async () => {
      getMock.mockResolvedValue({
        upcoming: [],
        past: [
          reservation({
            id: "res-4",
            status: "completed",
            timeframe: "past",
          }),
          reservation({
            id: "res-5",
            status: "cancelled",
            timeframe: "past",
          }),
        ],
      });

      renderPage();

      const history = await screen.findByRole("region", {
        name: "History",
      });

      expect(
        within(history).getByText("Completed"),
      ).toBeTruthy();

      expect(
        within(history).getByText("Cancelled"),
      ).toBeTruthy();
    });

    it("shows empty messages when there are no bookings", async () => {
      getMock.mockResolvedValue({
        upcoming: [],
        past: [],
      });

      renderPage();

      expect(
        await screen.findByText(/no upcoming bookings/i),
      ).toBeTruthy();

      expect(
        screen.getByText(/no past bookings/i),
      ).toBeTruthy();
    });

    it("shows an error when bookings cannot be loaded", async () => {
      getMock.mockRejectedValue(new Error("network down"));

      renderPage();

      expect(
        await screen.findByText(/unable to load your bookings/i),
      ).toBeTruthy();
    });
  });

  describe("CSYNC-21 — Cancel my reservation", () => {
    it("shows a cancel button for an upcoming active reservation", async () => {
      getMock.mockResolvedValue({
        upcoming: [upcomingReservation()],
        past: [],
      });

      renderPage();

      const upcoming = await screen.findByRole("region", {
        name: "Upcoming",
      });

      expect(
        within(upcoming).getByRole("button", {
          name: "Cancel reservation",
        }),
      ).toBeTruthy();
    });

    it("does not show a cancel button for completed reservations", async () => {
      getMock.mockResolvedValue({
        upcoming: [],
        past: [
          reservation({
            status: "completed",
            timeframe: "past",
          }),
        ],
      });

      renderPage();

      await screen.findByRole("region", {
        name: "History",
      });

      await screen.findByText("Completed");

      expect(
        screen.queryByRole("button", {
          name: "Cancel reservation",
        }),
      ).toBeNull();
    });

    it("does not show a cancel button for cancelled reservations", async () => {
      getMock.mockResolvedValue({
        upcoming: [],
        past: [
          reservation({
            status: "cancelled",
            timeframe: "past",
          }),
        ],
      });

      renderPage();

      await screen.findByText("Cancelled");

      expect(
        screen.queryByRole("button", {
          name: "Cancel reservation",
        }),
      ).toBeNull();
    });

    it("does not allow cancellation after a reservation has started", async () => {
      getMock.mockResolvedValue({
        upcoming: [
          reservation({
            status: "active",
            timeframe: "upcoming",
            startTime: "2020-01-01T15:00:00.000Z",
            endTime: "2020-01-01T16:00:00.000Z",
          }),
        ],
        past: [],
      });

      renderPage();

      await screen.findByText("Study Room 101");

      expect(
        screen.queryByRole("button", {
          name: "Cancel reservation",
        }),
      ).toBeNull();
    });

    it("asks for confirmation before cancelling", async () => {
      const user = userEvent.setup();

      getMock.mockResolvedValue({
        upcoming: [upcomingReservation()],
        past: [],
      });

      renderPage();

      await user.click(
        await screen.findByRole("button", {
          name: "Cancel reservation",
        }),
      );

      expect(
        screen.getByText(/Cancel this reservation for Study Room 101/i),
      ).toBeTruthy();

      expect(
        screen.getByRole("button", {
          name: "Yes, cancel it",
        }),
      ).toBeTruthy();

      expect(
        screen.getByRole("button", {
          name: "Keep it",
        }),
      ).toBeTruthy();

      expect(cancelMock).not.toHaveBeenCalled();
    });

    it("keeps the reservation if the user declines confirmation", async () => {
      const user = userEvent.setup();

      getMock.mockResolvedValue({
        upcoming: [upcomingReservation()],
        past: [],
      });

      renderPage();

      await user.click(
        await screen.findByRole("button", {
          name: "Cancel reservation",
        }),
      );

      await user.click(
        screen.getByRole("button", {
          name: "Keep it",
        }),
      );

      expect(cancelMock).not.toHaveBeenCalled();

      expect(
        screen.getByRole("button", {
          name: "Cancel reservation",
        }),
      ).toBeTruthy();

      const upcoming = screen.getByRole("region", {
        name: "Upcoming",
      });

      expect(
        within(upcoming).getByText("Study Room 101"),
      ).toBeTruthy();
    });

    it("cancels the user's reservation and moves it to history", async () => {
      const user = userEvent.setup();

      const booking = upcomingReservation();

      const cancelledBooking: Reservation = {
        ...booking,
        status: "cancelled",
        timeframe: "past",
      };

      getMock.mockResolvedValue({
        upcoming: [booking],
        past: [],
      });

      cancelMock.mockResolvedValue({
        message: "Your reservation has been cancelled.",
        reservation: cancelledBooking,
      });

      renderPage();

      await user.click(
        await screen.findByRole("button", {
          name: "Cancel reservation",
        }),
      );

      await user.click(
        screen.getByRole("button", {
          name: "Yes, cancel it",
        }),
      );

      await waitFor(() => {
        expect(cancelMock).toHaveBeenCalledWith(booking.id);
      });

      const history = await screen.findByRole("region", {
        name: "History",
      });

      await waitFor(() => {
        expect(
          within(history).getByText("Study Room 101"),
        ).toBeTruthy();

        expect(
          within(history).getByText("Cancelled"),
        ).toBeTruthy();
      });

      const upcoming = screen.getByRole("region", {
        name: "Upcoming",
      });

      expect(
        within(upcoming).queryByText("Study Room 101"),
      ).toBeNull();

      expect(
        screen.getByRole("status").textContent,
      ).toMatch(/has been cancelled/i);
    });

    it("shows an error if the backend rejects cancellation", async () => {
      const user = userEvent.setup();

      getMock.mockResolvedValue({
        upcoming: [upcomingReservation()],
        past: [],
      });

      cancelMock.mockRejectedValue(
        new CancelReservationError(
          "Only your upcoming active reservations can be cancelled.",
        ),
      );

      renderPage();

      await user.click(
        await screen.findByRole("button", {
          name: "Cancel reservation",
        }),
      );

      await user.click(
        screen.getByRole("button", {
          name: "Yes, cancel it",
        }),
      );

      expect(
        await screen.findByRole("alert"),
      ).toHaveProperty(
        "textContent",
        "Only your upcoming active reservations can be cancelled.",
      );

      const upcoming = screen.getByRole("region", {
        name: "Upcoming",
      });

      expect(
        within(upcoming).getByText("Study Room 101"),
      ).toBeTruthy();
    });
  });
});