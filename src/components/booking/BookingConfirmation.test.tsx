import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import BookingConfirmation from "./BookingConfirmation";

const reservation = {
  id: "r1",
  roomId: "room-id",
  roomName: "Study Room 101",
  roomLocation: "Library",
  userId: "u1",
  startTime: "2026-10-27T14:00:00.000Z",
  endTime: "2026-10-27T15:30:00.000Z",
  status: "active" as const,
  createdAt: "2026-10-26T12:00:00.000Z",
};

describe("BookingConfirmation", () => {
  it("shows the confirmed booking in campus time", () => {
    render(
      <MemoryRouter>
        <BookingConfirmation
          reservation={reservation}
          message="Your reservation is confirmed."
          onBookAnother={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status").textContent).toBe("Your reservation is confirmed.");
    expect(screen.getByText("Study Room 101")).toBeTruthy();
    expect(screen.getByText("Library")).toBeTruthy();
    expect(screen.getByText("Tuesday, October 27, 2026")).toBeTruthy();
    expect(screen.getByText(/10:00\s?AM – 11:30\s?AM EDT/)).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to rooms" }).getAttribute("href")).toBe("/rooms");
  });

  it("lets the user book another time", async () => {
    const user = userEvent.setup();
    const onBookAnother = vi.fn();

    render(
      <MemoryRouter>
        <BookingConfirmation
          reservation={reservation}
          message="Your reservation is confirmed."
          onBookAnother={onBookAnother}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Book another time" }));

    expect(onBookAnother).toHaveBeenCalledTimes(1);
  });
});
