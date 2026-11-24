import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManageRoomsPage from "./ManageRoomsPage";
import { deactivateRoom, getAdminRooms } from "../services/api";
import type { AdminRoom } from "../types/adminRoom";

vi.mock("../services/api", () => ({
  getAdminRooms: vi.fn(),
  deactivateRoom: vi.fn(),
}));

const getRoomsMock = vi.mocked(getAdminRooms);
const deactivateMock = vi.mocked(deactivateRoom);

const activeRoom: AdminRoom = {
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

const inactiveRoom: AdminRoom = {
  ...activeRoom,
  id: "22222222-3333-4444-5555-666666666666",
  name: "Study Room 202",
  isActive: false,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/rooms"]}>
      <ManageRoomsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getRoomsMock.mockResolvedValue([activeRoom, inactiveRoom]);
});

describe("ManageRoomsPage", () => {
  it("displays active and inactive rooms", async () => {
    renderPage();

    expect(await screen.findByText("Study Room 101")).toBeTruthy();
    expect(screen.getByText("Study Room 202")).toBeTruthy();

    const activeRow = screen.getByText("Study Room 101").closest("tr");
    const inactiveRow = screen.getByText("Study Room 202").closest("tr");

    expect(
      within(activeRow!).getByText("Active"),
    ).toBeTruthy();

    expect(
      within(inactiveRow!).getByText("Inactive"),
    ).toBeTruthy();
  });

  it("provides editing links for both rooms", async () => {
    renderPage();

    await screen.findByText("Study Room 101");

    const editLinks = screen.getAllByRole("link", { name: "Edit" });

    expect(editLinks).toHaveLength(2);

    expect(editLinks[0].getAttribute("href")).toBe(
      `/admin/rooms/${activeRoom.id}/edit`,
    );

    expect(editLinks[1].getAttribute("href")).toBe(
      `/admin/rooms/${inactiveRoom.id}/edit`,
    );
  });

  it("requires confirmation before deactivation", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Study Room 101");

    await user.click(
      screen.getByRole("button", { name: "Deactivate" }),
    );

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(
      screen.getByText(/existing reservation records will be preserved/i),
    ).toBeTruthy();

    expect(deactivateMock).not.toHaveBeenCalled();
  });

  it("does not deactivate a room when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Study Room 101");

    await user.click(
      screen.getByRole("button", { name: "Deactivate" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Cancel" }),
    );

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(deactivateMock).not.toHaveBeenCalled();
  });

  it("deactivates a room and updates its status", async () => {
    const user = userEvent.setup();

    deactivateMock.mockResolvedValue({
      message: "The room has been deactivated.",
      room: { ...activeRoom, isActive: false },
    });

    renderPage();

    await screen.findByText("Study Room 101");

    await user.click(
      screen.getByRole("button", { name: "Deactivate" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Deactivate room" }),
    );

    await waitFor(() => {
      expect(deactivateMock).toHaveBeenCalledWith(activeRoom.id);
    });

    expect(
      await screen.findByText(/Study Room 101 has been deactivated/i),
    ).toBeTruthy();

    const roomRow = screen.getByText("Study Room 101").closest("tr");

    expect(within(roomRow!).getByText("Inactive")).toBeTruthy();
    expect(within(roomRow!).queryByRole("button")).toBeNull();
  });

  it("shows an error when rooms cannot be loaded", async () => {
    getRoomsMock.mockRejectedValue(
      new Error("Unable to load rooms."),
    );

    renderPage();

    expect(
      await screen.findByRole("alert"),
    ).toHaveProperty("textContent", "Unable to load rooms.");
  });

  it("shows an error when deactivation fails", async () => {
    const user = userEvent.setup();

    deactivateMock.mockRejectedValue(
      new Error("Unable to deactivate the room."),
    );

    renderPage();

    await screen.findByText("Study Room 101");

    await user.click(
      screen.getByRole("button", { name: "Deactivate" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Deactivate room" }),
    );

    expect(
      await screen.findByText("Unable to deactivate the room."),
    ).toBeTruthy();

    
    
    const roomRow = screen
     .getByRole("table")
     .querySelector<HTMLTableRowElement>("tbody tr");

    expect(roomRow).not.toBeNull();
    expect(within(roomRow!).getByText("Active")).toBeTruthy();


  });
});
