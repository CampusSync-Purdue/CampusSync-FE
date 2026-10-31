import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReservation, getRoomAvailability } from "./reservationService";
import { AUTH_TOKEN_KEY } from "./authToken";
import { ReservationError } from "../types/reservation";

const payload = {
  roomId: "2f6b1c4e-8a3d-4f5b-9c71-0d2e3a4b5c01",
  startTime: "2026-10-27T14:00:00.000Z",
  endTime: "2026-10-27T15:00:00.000Z",
};

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

async function captureError(promise: Promise<unknown>): Promise<ReservationError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ReservationError);
    return error as ReservationError;
  }

  throw new Error("expected createReservation to throw");
}

beforeEach(() => {
  localStorage.setItem(AUTH_TOKEN_KEY, "test-token");
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("createReservation", () => {
  it("posts the booking with the bearer token", async () => {
    const fetchMock = mockFetch(201, { message: "ok", reservation: { id: "r1" } });

    const result = await createReservation(payload);

    expect(result.reservation.id).toBe("r1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/reservations$/);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-token");
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it("does not call the API when signed out", async () => {
    localStorage.clear();
    const fetchMock = mockFetch(201, {});

    const error = await captureError(createReservation(payload));

    expect(error.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("carries the status and field errors from a failed request", async () => {
    mockFetch(409, {
      message: "This room is already booked.",
      errors: { startTime: "This room is already booked.", other: "ignored" },
    });

    const error = await captureError(createReservation(payload));

    expect(error.status).toBe(409);
    expect(error.message).toBe("This room is already booked.");
    expect(error.fieldErrors).toEqual({ startTime: "This room is already booked." });
  });

  it("reports network failures with status 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await captureError(createReservation(payload));

    expect(error.status).toBe(0);
    expect(error.message).toMatch(/unable to reach the server/i);
  });
});

describe("getRoomAvailability", () => {
  it("requests the room's availability for a date with the bearer token", async () => {
    const availability = {
      roomId: payload.roomId,
      date: "2026-10-27",
      timeZone: "America/Indiana/Indianapolis",
      openingHours: { open: "08:00", close: "20:00" },
      booked: [{ startTime: payload.startTime, endTime: payload.endTime }],
    };
    const fetchMock = mockFetch(200, availability);

    const result = await getRoomAvailability(payload.roomId, "2026-10-27");

    expect(result).toEqual(availability);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(
      new RegExp(`/api/rooms/${payload.roomId}/availability\\?date=2026-10-27$`),
    );
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect(init.headers.Authorization).toBe("Bearer test-token");
  });

  it("throws a ReservationError with the status on failure", async () => {
    mockFetch(404, { message: "This room does not exist." });

    const error = await captureError(getRoomAvailability(payload.roomId, "2026-10-27"));

    expect(error.status).toBe(404);
    expect(error.message).toBe("This room does not exist.");
  });
});
