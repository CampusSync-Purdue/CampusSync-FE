import { describe, expect, it } from "vitest";
import {
  parseAmenities,
  toNewRoomRequest,
  validateAddRoomForm,
} from "./roomValidation";
import {
  EMPTY_ADD_ROOM_FORM,
  type AddRoomFormValues,
} from "../types/adminRoom";

function form(overrides: Partial<AddRoomFormValues> = {}): AddRoomFormValues {
  return {
    ...EMPTY_ADD_ROOM_FORM,
    name: "Study Room 101",
    location: "Library",
    capacity: "8",
    hours: {
      ...EMPTY_ADD_ROOM_FORM.hours,
      monday: { enabled: true, open: "08:00", close: "22:00" },
    },
    ...overrides,
  };
}

describe("validateAddRoomForm", () => {
  it("accepts a well-formed room", () => {
    expect(validateAddRoomForm(form())).toEqual({});
  });

  it("requires a name", () => {
    expect(validateAddRoomForm(form({ name: "  " })).name).toBeTruthy();
  });

  it("requires a location", () => {
    expect(validateAddRoomForm(form({ location: "" })).location).toBeTruthy();
  });

  it("requires a capacity", () => {
    expect(validateAddRoomForm(form({ capacity: "" })).capacity).toBeTruthy();
  });

  it("rejects a non-numeric capacity", () => {
    expect(validateAddRoomForm(form({ capacity: "eight" })).capacity).toBeTruthy();
  });

  it("rejects a capacity below 1", () => {
    expect(validateAddRoomForm(form({ capacity: "0" })).capacity).toBeTruthy();
  });

  it("requires at least one open day", () => {
    expect(
      validateAddRoomForm(form({ hours: EMPTY_ADD_ROOM_FORM.hours }))
        .availabilityHours,
    ).toBeTruthy();
  });

  it("requires both times on an open day", () => {
    const errors = validateAddRoomForm(
      form({
        hours: {
          ...EMPTY_ADD_ROOM_FORM.hours,
          monday: { enabled: true, open: "08:00", close: "" },
        },
      }),
    );

    expect(errors.availabilityHours).toBeTruthy();
  });
});

describe("parseAmenities", () => {
  it("splits a comma-separated list", () => {
    expect(parseAmenities("WiFi, Whiteboard")).toEqual(["WiFi", "Whiteboard"]);
  });

  it("drops blank entries", () => {
    expect(parseAmenities("WiFi, , Whiteboard,")).toEqual([
      "WiFi",
      "Whiteboard",
    ]);
  });

  it("returns an empty list for an empty field", () => {
    expect(parseAmenities("   ")).toEqual([]);
  });
});

describe("toNewRoomRequest", () => {
  it("includes only the days that were opened", () => {
    const request = toNewRoomRequest(
      form({
        hours: {
          ...EMPTY_ADD_ROOM_FORM.hours,
          monday: { enabled: true, open: "08:00", close: "22:00" },
          tuesday: { enabled: false, open: "09:00", close: "17:00" },
        },
      }),
    );

    expect(request.availabilityHours).toEqual({
      monday: { open: "08:00", close: "22:00" },
    });
  });

  it("converts the capacity to a number", () => {
    expect(toNewRoomRequest(form({ capacity: "12" })).capacity).toBe(12);
  });

  it("trims text fields", () => {
    expect(toNewRoomRequest(form({ name: "  Room  " })).name).toBe("Room");
  });
});
