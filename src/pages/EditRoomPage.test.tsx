import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditRoomPage from "./EditRoomPage";
import { getAdminRoomById, updateRoom } from "../services/api";
import type { AdminRoom } from "../types/adminRoom";

vi.mock("../services/api", () => ({
  getAdminRoomById: vi.fn(),
  updateRoom: vi.fn(),
}));

const getRoomMock = vi.mocked(getAdminRoomById);
const updateMock = vi.mocked(updateRoom);

const existingRoom: AdminRoom = {
  id: "11111111-2222-3333-4444-555555555555",
  name: "Study Room 101",
  location: "Library",
  capacity: 8,
  description: "A quiet study room.",
  amenities: ["WiFi"],
  availabilityHours: {
    monday: { open: "08:00", close: "22:00" },
  },
  isActive: true,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/admin/rooms/${existingRoom.id}/edit`]}>
      <Routes>
        <Route
          path="/admin/rooms/:roomId/edit"
          element={<EditRoomPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getRoomMock.mockResolvedValue(existingRoom);
});

describe("EditRoomPage", () => {
  it("loads the existing room information", async () => {
    renderPage();

    expect(
      await screen.findByDisplayValue("Study Room 101"),
    ).toBeTruthy();

    expect(screen.getByDisplayValue("Library")).toBeTruthy();
    expect(screen.getByDisplayValue("8")).toBeTruthy();
    expect(screen.getByDisplayValue("WiFi")).toBeTruthy();

    expect(
      screen.getByLabelText("Open on Monday"),
    ).toHaveProperty("checked", true);
  });

  it("submits updated room information", async () => {
    const user = userEvent.setup();

    updateMock.mockResolvedValue({
      message: "The room has been updated.",
      room: {
        ...existingRoom,
        name: "Updated Study Room",
      },
    });

    renderPage();

    const nameInput = await screen.findByDisplayValue("Study Room 101");

    await user.clear(nameInput);
    await user.type(nameInput, "Updated Study Room");

    await user.click(
      screen.getByRole("button", { name: "Save Changes" }),
    );

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        existingRoom.id,
        expect.objectContaining({
          name: "Updated Study Room",
          location: "Library",
          capacity: 8,
        }),
      );
    });

    expect(
      await screen.findByText(/Updated Study Room has been updated/i),
    ).toBeTruthy();
  });

  it("does not submit invalid room information", async () => {
    const user = userEvent.setup();
    renderPage();

    const nameInput = await screen.findByDisplayValue("Study Room 101");

    await user.clear(nameInput);

    await user.click(
      screen.getByRole("button", { name: "Save Changes" }),
    );

    expect(
      await screen.findByText(/a room name is required/i),
    ).toBeTruthy();

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("shows an error if the room cannot be loaded", async () => {
    getRoomMock.mockRejectedValue(new Error("Room not found."));

    renderPage();

    expect(
      await screen.findByText("Room not found."),
    ).toBeTruthy();

    expect(updateMock).not.toHaveBeenCalled();
  });
});
