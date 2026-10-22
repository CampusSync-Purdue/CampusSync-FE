import type { AvailableRoom, OperatingHours } from "./availability";

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** One weekday's row in the form: whether the room opens, and when. */
export type DayHoursInput = {
  enabled: boolean;
  open: string;
  close: string;
};

export type AddRoomFormValues = {
  name: string;
  location: string;
  capacity: string;
  description: string;
  amenities: string;
  hours: Record<Weekday, DayHoursInput>;
};

const DEFAULT_DAY: DayHoursInput = {
  enabled: false,
  open: "08:00",
  close: "22:00",
};

export const EMPTY_ADD_ROOM_FORM: AddRoomFormValues = {
  name: "",
  location: "",
  capacity: "",
  description: "",
  amenities: "",
  hours: WEEKDAYS.reduce(
    (hours, day) => ({ ...hours, [day]: { ...DEFAULT_DAY } }),
    {} as Record<Weekday, DayHoursInput>,
  ),
};

/** Field-level messages keyed by form field, matching the backend's shape. */
export type AddRoomFieldErrors = Partial<
  Record<
    | "name"
    | "location"
    | "capacity"
    | "availabilityHours"
    | "description"
    | "amenities",
    string
  >
>;

/** The request body the backend expects. */
export type NewRoomRequest = {
  name: string;
  location: string;
  capacity: number;
  description: string;
  amenities: string[];
  availabilityHours: OperatingHours;
};

export type CreateRoomSuccess = {
  message: string;
  room: AvailableRoom;
};

/** Thrown for any non-2xx room-creation response. */
export class CreateRoomError extends Error {
  readonly fieldErrors: AddRoomFieldErrors;

  constructor(message: string, fieldErrors: AddRoomFieldErrors = {}) {
    super(message);
    this.name = "CreateRoomError";
    this.fieldErrors = fieldErrors;
  }
}
