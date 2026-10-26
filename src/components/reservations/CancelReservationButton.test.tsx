import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CancelReservationButton } from "./CancelReservationButton";
import { cancelReservation } from "../../services/api";
import {
  CancelReservationError,
  type Reservation,
} from "../../types/reservation";

vi.mock("../../services/api", () => ({
  cancelReservation: vi.fn(),
}));

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

function renderButton(overrides: Partial<Reservation> = {}) {
  const onCancelled = vi.fn();

  render(
    <CancelReservationButton
      reservation={reservation(overrides)}
      onCancelled={onCancelled}
    />,
  );

  return { onCancelled };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CancelReservationButton", () => {
  it("asks for confirmation before cancelling", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: /cancel reservation/i }));

    expect(screen.getByText(/this cannot be undone/i)).toBeTruthy();
    expect(cancelMock).not.toHaveBeenCalled();
  });

  it("cancels once the action is confirmed", async () => {
    const cancelled = reservation({ status: "cancelled", timeframe: "past" });
    cancelMock.mockResolvedValue({
      message: "The reservation has been cancelled.",
      reservation: cancelled,
    });

    const user = userEvent.setup();
    const { onCancelled } = renderButton();

    await user.click(screen.getByRole("button", { name: /cancel reservation/i }));
    await user.click(screen.getByRole("button", { name: /yes, cancel it/i }));

    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith("res-1"));
    expect(onCancelled).toHaveBeenCalledWith(cancelled);
  });

  it("does nothing when the administrator backs out", async () => {
    const user = userEvent.setup();
    const { onCancelled } = renderButton();

    await user.click(screen.getByRole("button", { name: /cancel reservation/i }));
    await user.click(screen.getByRole("button", { name: /keep it/i }));

    expect(screen.getByRole("button", { name: /cancel reservation/i })).toBeTruthy();
    expect(cancelMock).not.toHaveBeenCalled();
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it("is not offered for a cancelled reservation", () => {
    renderButton({ status: "cancelled", timeframe: "past" });

    expect(screen.queryByRole("button", { name: /cancel reservation/i })).toBeNull();
  });

  it("is not offered for a completed reservation", () => {
    renderButton({ status: "completed", timeframe: "past" });

    expect(screen.queryByRole("button", { name: /cancel reservation/i })).toBeNull();
  });

  it("shows the backend's message when the cancellation is refused", async () => {
    cancelMock.mockRejectedValue(
      new CancelReservationError(
        "Only an upcoming active reservation can be cancelled.",
      ),
    );

    const user = userEvent.setup();
    const { onCancelled } = renderButton();

    await user.click(screen.getByRole("button", { name: /cancel reservation/i }));
    await user.click(screen.getByRole("button", { name: /yes, cancel it/i }));

    expect(
      await screen.findByText(/only an upcoming active reservation/i),
    ).toBeTruthy();
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it("shows an error when the cancellation fails unexpectedly", async () => {
    cancelMock.mockRejectedValue(new Error("network down"));

    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: /cancel reservation/i }));
    await user.click(screen.getByRole("button", { name: /yes, cancel it/i }));

    expect(
      await screen.findByText(/unable to cancel the reservation/i),
    ).toBeTruthy();
  });
});
