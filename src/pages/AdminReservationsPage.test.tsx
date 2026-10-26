import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminReservationsPage from "./AdminReservationsPage";
import { cancelReservation, getAllReservations } from "../services/api";
import type { Reservation } from "../types/reservation";

vi.mock("../services/api", () => ({
  getAllReservations: vi.fn(),
  cancelReservation: vi.fn(),
}));

const getMock = vi.mocked(getAllReservations);
const cancelMock = vi.mocked(cancelReservation);

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "res-1",
    userId: "user-1",
    startTime: "2090-01-01T18:00:00.000Z",
    endTime: "2090-01-01T20:00:00.000Z",
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
    <MemoryRouter initialEntries={["/admin/reservations"]}>
      <AdminReservationsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminReservationsPage", () => {
  it("lists upcoming reservations with a cancellation action", async () => {
    getMock.mockResolvedValue({ upcoming: [reservation()], past: [] });

    renderPage();

    const upcoming = await screen.findByRole("region", { name: "Upcoming" });

    expect(within(upcoming).getByText("Study Room 101")).toBeTruthy();
    expect(
      within(upcoming).getByRole("button", { name: /cancel reservation/i }),
    ).toBeTruthy();
  });

  it("moves a cancelled reservation into history and shows its new status", async () => {
    getMock.mockResolvedValue({ upcoming: [reservation()], past: [] });
    cancelMock.mockResolvedValue({
      message: "The reservation has been cancelled.",
      reservation: reservation({ status: "cancelled", timeframe: "past" }),
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("region", { name: "Upcoming" });

    await user.click(screen.getByRole("button", { name: /cancel reservation/i }));
    await user.click(screen.getByRole("button", { name: /yes, cancel it/i }));

    const history = await screen.findByRole("region", { name: "History" });

    expect(within(history).getByText("Cancelled")).toBeTruthy();

    const upcoming = screen.getByRole("region", { name: "Upcoming" });

    expect(within(upcoming).getByText(/no upcoming reservations/i)).toBeTruthy();
  });

  it("offers no cancellation action for a past reservation", async () => {
    getMock.mockResolvedValue({
      upcoming: [],
      past: [reservation({ status: "completed", timeframe: "past" })],
    });

    renderPage();

    await screen.findByRole("region", { name: "History" });

    expect(
      screen.queryByRole("button", { name: /cancel reservation/i }),
    ).toBeNull();
  });

  it("reports an empty board", async () => {
    getMock.mockResolvedValue({ upcoming: [], past: [] });

    renderPage();

    expect(await screen.findByText(/no upcoming reservations/i)).toBeTruthy();
    expect(screen.getByText(/no past reservations/i)).toBeTruthy();
  });

  it("shows an error when reservations cannot be loaded", async () => {
    getMock.mockRejectedValue(new Error("network down"));

    renderPage();

    expect(await screen.findByText(/unable to load reservations/i)).toBeTruthy();
  });
});
