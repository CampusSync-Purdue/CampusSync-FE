import { describe, expect, it } from "vitest";
import type { OpeningHours } from "../types/room";
import { campusTimeToInstant } from "../utils/campusTime";
import {
  bookingDateRange,
  endTimeOptions,
  pruneSelection,
  startTimeOptions,
  timelineSlots,
  toReservationTimes,
  validateBookingForm,
} from "./bookingValidation";

const DAILY: OpeningHours = Object.fromEntries(
  ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map(
    (day) => [day, { open: "08:00", close: "20:00" }],
  ),
);

// Monday 26 October 2026, 08:00 campus time (EDT).
const NOW = new Date("2026-10-26T12:00:00Z");
const TOMORROW = "2026-10-27";

describe("bookingDateRange", () => {
  it("allows today through 30 days ahead in campus time", () => {
    expect(bookingDateRange(NOW)).toEqual({ min: "2026-10-26", max: "2026-11-25" });
  });
});

describe("startTimeOptions", () => {
  it("offers 30-minute starts from opening until 30 minutes before closing", () => {
    const options = startTimeOptions(DAILY, TOMORROW, NOW);

    expect(options[0]).toBe("08:00");
    expect(options[1]).toBe("08:30");
    expect(options.at(-1)).toBe("19:30");
    expect(options).toHaveLength(24);
  });

  it("skips start times that have already passed today", () => {
    const options = startTimeOptions(DAILY, "2026-10-26", new Date("2026-10-26T14:10:00Z"));

    // 14:10Z is 10:10 EDT, so the first free start is 10:30.
    expect(options[0]).toBe("10:30");
  });

  it("returns nothing on a closed day", () => {
    expect(startTimeOptions({ monday: { open: "08:00", close: "20:00" } }, TOMORROW, NOW)).toEqual([]);
  });
});

describe("endTimeOptions", () => {
  it("offers 30 minutes to 4 hours after the start", () => {
    expect(endTimeOptions(DAILY, TOMORROW, "10:00")).toEqual([
      "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00",
    ]);
  });

  it("stops at closing time", () => {
    expect(endTimeOptions(DAILY, TOMORROW, "18:30")).toEqual(["19:00", "19:30", "20:00"]);
  });
});

describe("with booked times", () => {
  // Booked 10:00–11:00 tomorrow, campus time.
  const booked = [
    {
      startTime: campusTimeToInstant(TOMORROW, "10:00").toISOString(),
      endTime: campusTimeToInstant(TOMORROW, "11:00").toISOString(),
    },
  ];

  it("marks timeline blocks as available, booked or past", () => {
    const slots = timelineSlots(DAILY, TOMORROW, booked, NOW);

    expect(slots).toHaveLength(24);
    expect(slots.find((slot) => slot.start === "09:30")?.state).toBe("available");
    expect(slots.find((slot) => slot.start === "10:00")?.state).toBe("booked");
    expect(slots.find((slot) => slot.start === "10:30")?.state).toBe("booked");
    expect(slots.find((slot) => slot.start === "11:00")?.state).toBe("available");

    const mine = timelineSlots(DAILY, TOMORROW, [{ ...booked[0], isMine: true }], NOW);
    expect(mine.find((slot) => slot.start === "10:00")?.state).toBe("mine");
    expect(startTimeOptions(DAILY, TOMORROW, NOW, [{ ...booked[0], isMine: true }])).not.toContain(
      "10:00",
    );

    const today = timelineSlots(DAILY, "2026-10-26", [], new Date("2026-10-26T14:10:00Z"));
    expect(today.find((slot) => slot.start === "10:00")?.state).toBe("past");
    expect(today.find((slot) => slot.start === "10:30")?.state).toBe("available");
  });

  it("excludes booked starts and stops end times at the next booking", () => {
    const starts = startTimeOptions(DAILY, TOMORROW, NOW, booked);

    expect(starts).not.toContain("10:00");
    expect(starts).not.toContain("10:30");
    expect(starts).toContain("09:30");
    expect(starts).toContain("11:00");
    expect(endTimeOptions(DAILY, TOMORROW, "08:30", booked)).toEqual(["09:00", "09:30", "10:00"]);
  });

  it("drops a selection that is now booked", () => {
    expect(
      pruneSelection({ date: TOMORROW, startTime: "10:00", endTime: "11:00" }, DAILY, booked, NOW),
    ).toEqual({ date: TOMORROW, startTime: "", endTime: "" });
    expect(
      pruneSelection({ date: TOMORROW, startTime: "09:00", endTime: "10:30" }, DAILY, booked, NOW),
    ).toEqual({ date: TOMORROW, startTime: "09:00", endTime: "" });
  });

  it("rejects a booking that overlaps a reservation", () => {
    expect(
      validateBookingForm({ date: TOMORROW, startTime: "09:00", endTime: "10:30" }, DAILY, NOW, booked)
        .endTime,
    ).toMatch(/next booking/);
  });
});

describe("validateBookingForm", () => {
  it("accepts a valid booking", () => {
    expect(
      validateBookingForm({ date: TOMORROW, startTime: "10:00", endTime: "11:00" }, DAILY, NOW),
    ).toEqual({});
  });

  it("requires every field", () => {
    expect(validateBookingForm({ date: "", startTime: "", endTime: "" }, DAILY, NOW)).toEqual({
      date: "Choose a date.",
      startTime: "Choose a start time.",
      endTime: "Choose an end time.",
    });
  });

  it("rejects past dates and dates more than 30 days ahead", () => {
    expect(
      validateBookingForm({ date: "2026-10-25", startTime: "10:00", endTime: "11:00" }, DAILY, NOW).date,
    ).toBe("Choose today or a later date.");
    expect(
      validateBookingForm({ date: "2026-11-26", startTime: "10:00", endTime: "11:00" }, DAILY, NOW).date,
    ).toMatch(/30 days/);
  });

  it("rejects times outside opening hours and over 4 hours", () => {
    expect(
      validateBookingForm({ date: TOMORROW, startTime: "07:30", endTime: "08:30" }, DAILY, NOW).startTime,
    ).toBe("Choose an available start time.");
    expect(
      validateBookingForm({ date: TOMORROW, startTime: "10:00", endTime: "14:30" }, DAILY, NOW).endTime,
    ).toMatch(/4 hours/);
    expect(
      validateBookingForm({ date: TOMORROW, startTime: "19:30", endTime: "20:30" }, DAILY, NOW).endTime,
    ).toMatch(/before closing/);
  });
});

describe("toReservationTimes", () => {
  it("converts campus wall-clock times to UTC ISO strings", () => {
    expect(toReservationTimes({ date: TOMORROW, startTime: "10:00", endTime: "11:30" })).toEqual({
      startTime: "2026-10-27T14:00:00.000Z",
      endTime: "2026-10-27T15:30:00.000Z",
    });
  });

  it("uses standard time after the DST change", () => {
    expect(campusTimeToInstant("2026-11-02", "08:00").toISOString()).toBe(
      "2026-11-02T13:00:00.000Z",
    );
  });
});
