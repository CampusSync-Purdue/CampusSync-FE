import { describe, expect, it } from "vitest";
import {
  describeMaxDuration,
  durationMinutes,
  validateAvailabilityForm,
} from "./availabilityValidation";
import type { AvailabilityFormValues } from "../types/availability";

const VALID: AvailabilityFormValues = {
  date: "2026-10-21",
  startTime: "14:00",
  endTime: "16:00",
};

describe("validateAvailabilityForm", () => {
  it("accepts a well-formed window", () => {
    expect(validateAvailabilityForm(VALID)).toEqual({});
  });

  it("requires every field", () => {
    const errors = validateAvailabilityForm({
      date: "",
      startTime: "",
      endTime: "",
    });

    expect(errors.date).toBeTruthy();
    expect(errors.startTime).toBeTruthy();
    expect(errors.endTime).toBeTruthy();
  });

  it("rejects a malformed date", () => {
    expect(validateAvailabilityForm({ ...VALID, date: "21/10/2026" }).date).toBeTruthy();
  });

  it("rejects a malformed time", () => {
    expect(
      validateAvailabilityForm({ ...VALID, startTime: "2pm" }).startTime,
    ).toBeTruthy();
  });

  it("rejects an hour outside the 24-hour clock", () => {
    expect(
      validateAvailabilityForm({ ...VALID, startTime: "24:00" }).startTime,
    ).toBeTruthy();
  });

  it("requires the end time to be after the start time", () => {
    expect(
      validateAvailabilityForm({ ...VALID, startTime: "16:00", endTime: "14:00" })
        .endTime,
    ).toBeTruthy();
  });

  it("rejects an end time equal to the start time", () => {
    expect(
      validateAvailabilityForm({ ...VALID, startTime: "14:00", endTime: "14:00" })
        .endTime,
    ).toBeTruthy();
  });

  it("ignores surrounding whitespace", () => {
    expect(
      validateAvailabilityForm({
        date: " 2026-10-21 ",
        startTime: " 14:00 ",
        endTime: " 16:00 ",
      }),
    ).toEqual({});
  });
});

describe("durationMinutes", () => {
  it("measures a whole-hour range", () => {
    expect(durationMinutes("14:00", "16:00")).toBe(120);
  });

  it("measures a range with minutes", () => {
    expect(durationMinutes("09:15", "10:45")).toBe(90);
  });

  it("returns zero for an empty range", () => {
    expect(durationMinutes("14:00", "14:00")).toBe(0);
  });
});

describe("describeMaxDuration", () => {
  it("names a whole number of hours", () => {
    expect(describeMaxDuration(180)).toBe("3 hours");
    expect(describeMaxDuration(60)).toBe("1 hour");
  });

  it("falls back to minutes when hours do not divide evenly", () => {
    expect(describeMaxDuration(90)).toBe("90 minutes");
    expect(describeMaxDuration(1)).toBe("1 minute");
  });
});
