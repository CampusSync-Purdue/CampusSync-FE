import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddRoomPage from "./AddRoomPage";
import { createRoom } from "../services/api";
import { CreateRoomError } from "../types/adminRoom";

vi.mock("../services/api", () => ({
  createRoom: vi.fn(),
}));

const createMock = vi.mocked(createRoom);

const createdRoom = {
  id: "11111111-2222-3333-4444-555555555555",
  name: "Study Room 101",
  location: "Library",
  capacity: 8,
  description: "",
  amenities: ["WiFi"],
  availabilityHours: { monday: { open: "08:00", close: "22:00" } },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/rooms/new"]}>
      <AddRoomPage />
    </MemoryRouter>,
  );
}

async function fillRequiredFields(
  user: ReturnType<typeof userEvent.setup>,
  overrides: { name?: string; location?: string; capacity?: string } = {},
) {
  const { name = "Study Room 101", location = "Library", capacity = "8" } = overrides;

  if (name) {
    await user.type(screen.getByLabelText("Name"), name);
  }
  if (location) {
    await user.type(screen.getByLabelText("Location"), location);
  }
  if (capacity) {
    await user.type(screen.getByLabelText("Capacity"), capacity);
  }
}

async function openMonday(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText("Open on Monday"));
}

function submit(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole("button", { name: /add room/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AddRoomPage", () => {
  it("creates a room and confirms it", async () => {
    createMock.mockResolvedValue({
      message: "The room has been created.",
      room: createdRoom,
    });

    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user);
    await openMonday(user);
    await submit(user);

    expect(
      await screen.findByText(/Study Room 101 has been added to the catalog/i),
    ).toBeTruthy();
  });

  it("sends the values the administrator entered", async () => {
    createMock.mockResolvedValue({
      message: "The room has been created.",
      room: createdRoom,
    });

    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(/amenities/i), "WiFi, Whiteboard");
    await openMonday(user);
    await submit(user);

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({
        name: "Study Room 101",
        location: "Library",
        capacity: 8,
        description: "",
        amenities: ["WiFi", "Whiteboard"],
        availabilityHours: { monday: { open: "08:00", close: "22:00" } },
      }),
    );
  });

  it("clears the form after a successful creation", async () => {
    createMock.mockResolvedValue({
      message: "The room has been created.",
      room: createdRoom,
    });

    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user);
    await openMonday(user);
    await submit(user);

    await screen.findByText(/has been added to the catalog/i);

    expect(screen.getByLabelText("Name")).toHaveProperty("value", "");
  });

  it("requires a name", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user, { name: "" });
    await openMonday(user);
    await submit(user);

    expect(await screen.findByText(/a room name is required/i)).toBeTruthy();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("requires a location", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user, { location: "" });
    await openMonday(user);
    await submit(user);

    expect(await screen.findByText(/a location is required/i)).toBeTruthy();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("requires a capacity", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user, { capacity: "" });
    await openMonday(user);
    await submit(user);

    expect(await screen.findByText(/a capacity is required/i)).toBeTruthy();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("requires operating hours for at least one day", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user);
    await submit(user);

    expect(
      await screen.findByText(/at least one day/i),
    ).toBeTruthy();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("keeps the time inputs disabled until a day is opened", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByLabelText("Monday opening time")).toHaveProperty(
      "disabled",
      true,
    );

    await openMonday(user);

    expect(screen.getByLabelText("Monday opening time")).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("shows the backend's field message when it rejects the room", async () => {
    createMock.mockRejectedValue(
      new CreateRoomError("Please correct the highlighted fields.", {
        name: "A room with this name already exists.",
      }),
    );

    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user);
    await openMonday(user);
    await submit(user);

    expect(
      await screen.findByText(/a room with this name already exists/i),
    ).toBeTruthy();
  });

  it("shows an error when creation fails unexpectedly", async () => {
    createMock.mockRejectedValue(new Error("network down"));

    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user);
    await openMonday(user);
    await submit(user);

    expect(await screen.findByText(/unable to create the room/i)).toBeTruthy();
  });
});
