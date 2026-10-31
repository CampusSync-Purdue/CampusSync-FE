
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoomAvailabilityPage from "./RoomAvailabilityPage";
import {
  getReservationRules,
  getRooms,
  searchRoomAvailability,
} from "../services/api";
import { AvailabilitySearchError } from "../types/availability";

vi.mock("../services/api", () => ({
  searchRoomAvailability: vi.fn(),
  getReservationRules: vi.fn(),
  getRooms: vi.fn(),
}));

const searchMock = vi.mocked(searchRoomAvailability);
const rulesMock = vi.mocked(getReservationRules);
const roomsMock = vi.mocked(getRooms);

const room = {
  id: "11111111-2222-3333-4444-555555555555",
  name: "Study Room 101",
  location: "Library",
  capacity: 8,
  description: "",
  amenities: ["WiFi", "Whiteboard"],
  availabilityHours: {
    wednesday: { open: "08:00", close: "22:00" },
  },
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
  const {
    date = "2026-10-21",
    startTime = "14:00",
    endTime = "16:00",
  } = values;

  if (date) {
    await user.type(screen.getByLabelText(/date/i), date);
  }

  if (startTime) {
    await user.selectOptions(
      screen.getByLabelText(/start time/i),
      startTime,
    );
  }

  if (endTime) {
    await user.selectOptions(
      screen.getByLabelText(/end time/i),
      endTime,
    );
  }

  await user.click(
    screen.getByRole("button", { name: /^search$/i }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  rulesMock.mockResolvedValue({
    maxDurationMinutes: 180,
  });

  roomsMock.mockResolvedValue([
    {
      id: room.id,
      name: room.name,
      location: room.location,
      capacity: room.capacity,
      amenities: room.amenities,
      openingHours: room.availabilityHours,
    },
  ]);
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

    expect(
      await screen.findByText("Study Room 101"),
    ).toBeTruthy();

    expect(
      screen.getByText(/Location: Library/),
    ).toBeTruthy();
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
        location: "",
        minCapacity: "",
        amenities: [],
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

    expect(
      await screen.findByText(/no rooms are available/i),
    ).toBeTruthy();
  });

  it("rejects an end time before the start time without calling the API", async () => {
    const user = userEvent.setup();
    renderPage();

    await searchFor(user, {
      startTime: "16:00",
      endTime: "14:00",
    });

    expect(
      await screen.findByText(/end time must be after the start time/i),
    ).toBeTruthy();

    expect(searchMock).not.toHaveBeenCalled();
  });

  it("requires a date before searching", async () => {
    const user = userEvent.setup();
    renderPage();
    await searchFor(user, { date: "" });

    expect(
      await screen.findByText(/a date is required/i),
    ).toBeTruthy();

    expect(searchMock).not.toHaveBeenCalled();
  });

  it("shows the backend's field message when it rejects the window", async () => {
    searchMock.mockRejectedValue(
      new AvailabilitySearchError(
        "Please correct the highlighted fields.",
        {
          startTime: "Nonexistent campus-local time.",
        },
      ),
    );

    const user = userEvent.setup();
    renderPage();

    await searchFor(user, {
      date: "2026-03-08",
      startTime: "02:30",
      endTime: "03:30",
    });

    expect(
      await screen.findByText(/nonexistent campus-local time/i),
    ).toBeTruthy();
  });

  it("shows an error when the search fails unexpectedly", async () => {
    searchMock.mockRejectedValue(
      new Error("network down"),
    );

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

    await user.selectOptions(
      screen.getByLabelText(/start time/i),
      "09:00",
    );

    await user.selectOptions(
      screen.getByLabelText(/end time/i),
      "17:00",
    );

    expect(
      await screen.findByText(/longer than 3 hours/i),
    ).toBeTruthy();
  });

  it("does not warn for a range within the limit", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/reservations may be up to 3 hours/i);

    await user.selectOptions(
      screen.getByLabelText(/start time/i),
      "14:00",
    );

    await user.selectOptions(
      screen.getByLabelText(/end time/i),
      "16:00",
    );

    expect(
      screen.queryByText(/longer than 3 hours/i),
    ).toBeNull();
  });

  it("still allows searching when the limit cannot be read", async () => {
    rulesMock.mockRejectedValue(
      new Error("rules unavailable"),
    );

    searchMock.mockResolvedValue({
      date: "2026-10-21",
      startTime: "14:00",
      endTime: "16:00",
      rooms: [room],
    });

    const user = userEvent.setup();
    renderPage();
    await searchFor(user);

    expect(
      await screen.findByText("Study Room 101"),
    ).toBeTruthy();
  });
});

describe("RoomAvailabilityPage filters (CSYNC-16)", () => {
  it("sends location, capacity, and selected amenities together", async () => {
    searchMock.mockResolvedValue({
      date: "2026-10-21",
      startTime: "14:00",
      endTime: "16:00",
      rooms: [room],
    });

    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByLabelText(/^location$/i),
      "Library",
    );

    await user.type(
      screen.getByLabelText(/minimum capacity/i),
      "8",
    );

    await user.click(
      await screen.findByRole("checkbox", { name: "WiFi" }),
    );

    await user.click(
      screen.getByRole("checkbox", { name: "Whiteboard" }),
    );

    await searchFor(user);

    await waitFor(() =>
      expect(searchMock).toHaveBeenCalledWith({
        date: "2026-10-21",
        startTime: "14:00",
        endTime: "16:00",
        location: "Library",
        minCapacity: "8",
        amenities: ["WiFi", "Whiteboard"],
      }),
    );
  });

  it("clears optional filters without clearing the date and times", async () => {
    searchMock.mockResolvedValue({
      date: "2026-10-21",
      startTime: "14:00",
      endTime: "16:00",
      rooms: [room],
    });

    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByLabelText(/^date$/i),
      "2026-10-21",
    );

    await user.selectOptions(
      screen.getByLabelText(/start time/i),
      "14:00",
    );

    await user.selectOptions(
      screen.getByLabelText(/end time/i),
      "16:00",
    );

    await user.type(
      screen.getByLabelText(/^location$/i),
      "Library",
    );

    await user.type(
      screen.getByLabelText(/minimum capacity/i),
      "8",
    );

    await user.click(
      await screen.findByRole("checkbox", { name: "WiFi" }),
    );

    await user.click(
      screen.getByRole("button", { name: /clear filters/i }),
    );

    expect(
      (screen.getByLabelText(/^location$/i) as HTMLInputElement).value,
    ).toBe("");

    expect(
      (screen.getByLabelText(/minimum capacity/i) as HTMLInputElement).value,
    ).toBe("");

    expect(
      (screen.getByRole("checkbox", { name: "WiFi" }) as HTMLInputElement)
        .checked,
    ).toBe(false);

    expect(
      (screen.getByLabelText(/^date$/i) as HTMLInputElement).value,
    ).toBe("2026-10-21");

    expect(
      (screen.getByLabelText(/start time/i) as HTMLSelectElement).value,
    ).toBe("14:00");

    expect(
      (screen.getByLabelText(/end time/i) as HTMLSelectElement).value,
    ).toBe("16:00");

    await user.click(
      screen.getByRole("button", { name: /^search$/i }),
    );

    await waitFor(() =>
      expect(searchMock).toHaveBeenCalledWith({
        date: "2026-10-21",
        startTime: "14:00",
        endTime: "16:00",
        location: "",
        minCapacity: "",
        amenities: [],
      }),
    );
  });
});
