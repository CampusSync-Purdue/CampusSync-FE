import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyBookingsPage from "./MyBookingsPage";
import { getMyReservations } from "../services/api";
import type { Reservation } from "../types/reservation";

vi.mock("../services/api", () => ({
  getMyReservations: vi.fn(),
}));

const getMock = vi.mocked(getMyReservations);

function reservation(overrides: Partial<Reservation> = {}): Reservation {
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
  it("shows an upcoming booking in the upcoming section", async () => {
    getMock.mockResolvedValue({ upcoming: [reservation()], past: [] });

    renderPage();

    const upcoming = await screen.findByRole("region", { name: "Upcoming" });

    expect(within(upcoming).getByText("Study Room 101")).toBeTruthy();
    expect(within(upcoming).getByText(/Location: Library/)).toBeTruthy();
    expect(within(upcoming).getByText("Active")).toBeTruthy();
  });

  it("shows the date and time in campus local time", async () => {
    getMock.mockResolvedValue({ upcoming: [reservation()], past: [] });

    renderPage();

    expect(await screen.findByText(/Wed, Oct 21, 2026/)).toBeTruthy();
    // 18:00Z to 20:00Z is 2:00 PM to 4:00 PM EDT, not the browser's zone.
    expect(screen.getByText(/2:00\s*PM\s*–\s*4:00\s*PM\s*EDT/)).toBeTruthy();
  });

  it("shows a completed booking in history", async () => {
    getMock.mockResolvedValue({
      upcoming: [],
      past: [reservation({ id: "res-2", status: "completed", timeframe: "past" })],
    });

    renderPage();

    const history = await screen.findByRole("region", { name: "History" });

    expect(within(history).getByText("Completed")).toBeTruthy();
  });

  it("shows a cancelled booking in history", async () => {
    getMock.mockResolvedValue({
      upcoming: [],
      past: [reservation({ id: "res-3", status: "cancelled", timeframe: "past" })],
    });

    renderPage();

    const history = await screen.findByRole("region", { name: "History" });

    expect(within(history).getByText("Cancelled")).toBeTruthy();
  });

  it("distinguishes cancelled from completed in the same list", async () => {
    getMock.mockResolvedValue({
      upcoming: [],
      past: [
        reservation({ id: "res-4", status: "completed", timeframe: "past" }),
        reservation({ id: "res-5", status: "cancelled", timeframe: "past" }),
      ],
    });

    renderPage();

    const history = await screen.findByRole("region", { name: "History" });

    expect(within(history).getByText("Completed")).toBeTruthy();
    expect(within(history).getByText("Cancelled")).toBeTruthy();
  });

  it("tells a user with no bookings that each section is empty", async () => {
    getMock.mockResolvedValue({ upcoming: [], past: [] });

    renderPage();

    expect(await screen.findByText(/no upcoming bookings/i)).toBeTruthy();
    expect(screen.getByText(/no past bookings/i)).toBeTruthy();
  });

  it("shows an error when the bookings cannot be loaded", async () => {
    getMock.mockRejectedValue(new Error("network down"));

    renderPage();

    expect(await screen.findByText(/unable to load your bookings/i)).toBeTruthy();
  });
});
