import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoomAvailabilityPage from "./RoomAvailabilityPage";
import { getReservationRules, searchRoomAvailability } from "../services/api";
import { AvailabilitySearchError } from "../types/availability";

vi.mock("../services/api", () => ({
  searchRoomAvailability: vi.fn(),
  getReservationRules: vi.fn(),
}));

const searchMock = vi.mocked(searchRoomAvailability);
const rulesMock = vi.mocked(getReservationRules);

const room = {
  id: "11111111-2222-3333-4444-555555555555",
  name: "Study Room 101",
  location: "Library",
  capacity: 8,
  description: "",
  amenities: ["WiFi", "Whiteboard"],
  availabilityHours: { wednesday: { open: "08:00", close: "22:00" } },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/rooms/availability"]}>
      <RoomAvailabilityPage />
    </MemoryRouter>,
  );
}

async function searchFor(
  user: ReturnType<typeof userEvent.setup>,
  values: { date?: string; startTime?: string; endTime?: string } = {},
) {
  const { date = "2026-10-21", startTime = "14:00", endTime = "16:00" } = values;

  if (date) {
    await user.type(screen.getByLabelText(/date/i), date);
  }
  if (startTime) {
    await user.type(screen.getByLabelText(/start time/i), startTime);
  }
  if (endTime) {
    await user.type(screen.getByLabelText(/end time/i), endTime);
  }

  await user.click(screen.getByRole("button", { name: /search/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  rulesMock.mockResolvedValue({ maxDurationMinutes: 180 });
});

describe("RoomAvailabilityPage", () => {
  it("shows the rooms returned for the window", async () => {
    searchMock.mockResolvedValue({
      date: "2026-10-21",
      startTime: "14:00",
      endTime: "16:00",
      rooms: [room],
    });

    const user = userEvent.setup();
    renderPage();
    await searchFor(user);

    expect(await screen.findByText("Study Room 101")).toBeTruthy();
    expect(screen.getByText(/Location: Library/)).toBeTruthy();
  });

  it("sends the campus-local window the caller chose", async () => {
    searchMock.mockResolvedValue({
      date: "2026-10-21",
      startTime: "14:00",
      endTime: "16:00",
      rooms: [],
    });

    const user = userEvent.setup();
    renderPage();
    await searchFor(user);

    await waitFor(() =>
      expect(searchMock).toHaveBeenCalledWith({
        date: "2026-10-21",
        startTime: "14:00",
        endTime: "16:00",
      }),
    );
  });

  it("reports an empty result as a message rather than an error", async () => {
    searchMock.mockResolvedValue({
      date: "2026-10-21",
      startTime: "14:00",
      endTime: "16:00",
      rooms: [],
    });

    const user = userEvent.setup();
    renderPage();
    await searchFor(user);

    expect(await screen.findByText(/no rooms are available/i)).toBeTruthy();
  });

  it("rejects an end time before the start time without calling the API", async () => {
    const user = userEvent.setup();
    renderPage();
    await searchFor(user, { startTime: "16:00", endTime: "14:00" });

    expect(
      await screen.findByText(/end time must be after the start time/i),
    ).toBeTruthy();
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("requires a date before searching", async () => {
    const user = userEvent.setup();
    renderPage();
    await searchFor(user, { date: "" });

    expect(await screen.findByText(/a date is required/i)).toBeTruthy();
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("shows the backend's field message when it rejects the window", async () => {
    searchMock.mockRejectedValue(
      new AvailabilitySearchError("Please correct the highlighted fields.", {
        startTime: "Nonexistent campus-local time.",
      }),
    );

    const user = userEvent.setup();
    renderPage();
    await searchFor(user, { date: "2026-03-08", startTime: "02:30", endTime: "03:30" });

    expect(
      await screen.findByText(/nonexistent campus-local time/i),
    ).toBeTruthy();
  });

  it("shows an error when the search fails unexpectedly", async () => {
    searchMock.mockRejectedValue(new Error("network down"));

    const user = userEvent.setup();
    renderPage();
    await searchFor(user);

    expect(
      await screen.findByText(/unable to search room availability/i),
    ).toBeTruthy();
  });
});

describe("RoomAvailabilityPage duration limit", () => {
  it("shows the limit published by the backend", async () => {
    renderPage();

    expect(
      await screen.findByText(/reservations may be up to 3 hours/i),
    ).toBeTruthy();
  });

  it("warns as soon as the chosen range exceeds the limit", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/reservations may be up to 3 hours/i);

    await user.type(screen.getByLabelText(/start time/i), "09:00");
    await user.type(screen.getByLabelText(/end time/i), "17:00");

    expect(
      await screen.findByText(/longer than 3 hours/i),
    ).toBeTruthy();
  });

  it("does not warn for a range within the limit", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/reservations may be up to 3 hours/i);

    await user.type(screen.getByLabelText(/start time/i), "14:00");
    await user.type(screen.getByLabelText(/end time/i), "16:00");

    expect(screen.queryByText(/longer than 3 hours/i)).toBeNull();
  });

  it("still allows searching when the limit cannot be read", async () => {
    rulesMock.mockRejectedValue(new Error("rules unavailable"));
    searchMock.mockResolvedValue({
      date: "2026-10-21",
      startTime: "14:00",
      endTime: "16:00",
      rooms: [room],
    });

    const user = userEvent.setup();
    renderPage();
    await searchFor(user);

    expect(await screen.findByText("Study Room 101")).toBeTruthy();
  });
});
