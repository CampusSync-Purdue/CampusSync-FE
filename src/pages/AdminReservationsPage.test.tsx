import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminReservationsPage from "./AdminReservationsPage";
import {
  cancelReservation,
  getAllReservations,
  getRooms,
} from "../services/api";
import type { AdminReservation } from "../types/reservation";

vi.mock("../services/api", () => ({
  getAllReservations: vi.fn(),
  cancelReservation: vi.fn(),
  getRooms: vi.fn(),
}));

const listMock = vi.mocked(getAllReservations);
const cancelMock = vi.mocked(cancelReservation);
const roomsMock = vi.mocked(getRooms);

const ROOM_ID = "11111111-2222-3333-4444-555555555555";

function reservation(
  overrides: Partial<AdminReservation> = {},
): AdminReservation {
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
      id: ROOM_ID,
      name: "Study Room 101",
      location: "Library",
      capacity: 8,
    },
    user: { id: "user-1", name: "Ada Lovelace", email: "ada@purdue.edu" },
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

function lastQuery() {
  return listMock.mock.calls.at(-1)?.[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  roomsMock.mockResolvedValue([
    {
      id: ROOM_ID,
      name: "Study Room 101",
      location: "Library",
      capacity: 8,
      amenities: [],
      openingHours: {},
    },
  ]);
});

describe("AdminReservationsPage", () => {
  it("shows a loading state until reservations arrive", async () => {
    listMock.mockResolvedValue([reservation()]);
    renderPage();

    expect(screen.getByRole("status").textContent).toMatch(/loading/i);
    await screen.findByRole("table");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("lists the reserving user, room, date, time, and status", async () => {
    listMock.mockResolvedValue([reservation()]);
    renderPage();

    const table = await screen.findByRole("table");
    const row = within(table).getAllByRole("row")[1];

    expect(within(row).getByText("Ada Lovelace")).toBeTruthy();
    expect(within(row).getByText("ada@purdue.edu")).toBeTruthy();
    expect(within(row).getByText("Study Room 101")).toBeTruthy();
    expect(within(row).getByText(/Jan 1, 2090/)).toBeTruthy();
    expect(within(row).getByText(/1:00 PM – 3:00 PM EST/)).toBeTruthy();
    expect(within(row).getByText("Active")).toBeTruthy();
  });

  it("requests newest first by default", async () => {
    listMock.mockResolvedValue([]);
    renderPage();

    await screen.findByText(/no reservations yet/i);
    expect(lastQuery()).toEqual({
      date: "",
      roomId: "",
      status: "",
      sort: "date",
      order: "desc",
    });
  });

  it("filters by date, room, and status", async () => {
    listMock.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/no reservations yet/i);

    await user.type(screen.getByLabelText("Date"), "2090-01-01");
    await screen.findByRole("option", { name: "Study Room 101" });
    await user.selectOptions(screen.getByLabelText("Room"), ROOM_ID);
    await user.selectOptions(screen.getByLabelText("Status"), "cancelled");

    expect(lastQuery()).toMatchObject({
      date: "2090-01-01",
      roomId: ROOM_ID,
      status: "cancelled",
    });
    expect(
      await screen.findByText(/no reservations match these filters/i),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(lastQuery()).toMatchObject({ date: "", roomId: "", status: "" });
  });

  it("sorts by a column and toggles its direction", async () => {
    listMock.mockResolvedValue([reservation()]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("table");

    const roomHeader = screen.getByRole("columnheader", { name: /room/i });
    await user.click(within(roomHeader).getByRole("button"));
    expect(lastQuery()).toMatchObject({ sort: "room", order: "asc" });

    await screen.findByRole("table");
    const sortedHeader = screen.getByRole("columnheader", { name: /room/i });
    expect(sortedHeader.getAttribute("aria-sort")).toBe("ascending");

    await user.click(within(sortedHeader).getByRole("button"));
    expect(lastQuery()).toMatchObject({ sort: "room", order: "desc" });

    await screen.findByRole("table");
    await user.click(
      within(screen.getByRole("columnheader", { name: /status/i })).getByRole(
        "button",
      ),
    );
    expect(lastQuery()).toMatchObject({ sort: "status", order: "asc" });
  });

  it("updates a cancelled row in place and keeps its user", async () => {
    listMock.mockResolvedValue([reservation()]);
    cancelMock.mockResolvedValue({
      message: "The reservation has been cancelled.",
      reservation: reservation({ status: "cancelled", timeframe: "past" }),
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: /cancel reservation/i }));
    await user.click(screen.getByRole("button", { name: /yes, cancel it/i }));

    const row = screen.getAllByRole("row")[1];
    expect(await within(row).findByText("Cancelled")).toBeTruthy();
    expect(within(row).getByText("Ada Lovelace")).toBeTruthy();
    expect(
      within(row).queryByRole("button", { name: /cancel reservation/i }),
    ).toBeNull();
  });

  it("offers no cancellation for a completed reservation", async () => {
    listMock.mockResolvedValue([
      reservation({ status: "completed", timeframe: "past" }),
    ]);
    renderPage();
    await screen.findByRole("table");

    expect(
      screen.queryByRole("button", { name: /cancel reservation/i }),
    ).toBeNull();
  });

  it("shows an error and retries", async () => {
    listMock.mockRejectedValueOnce(new Error("Please correct the reservation filters."));
    listMock.mockResolvedValueOnce([reservation()]);
    const user = userEvent.setup();
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/please correct the reservation filters/i);

    await user.click(within(alert).getByRole("button", { name: /try again/i }));
    expect(await screen.findByRole("table")).toBeTruthy();
  });

  it("still lists reservations when rooms cannot be loaded", async () => {
    roomsMock.mockRejectedValue(new Error("down"));
    listMock.mockResolvedValue([reservation()]);
    renderPage();

    expect(await screen.findByRole("table")).toBeTruthy();
    expect(
      within(screen.getByLabelText("Room")).getAllByRole("option"),
    ).toHaveLength(1);
  });
});
