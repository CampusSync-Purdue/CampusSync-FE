import type { DayOfWeek } from "../utils/campusTime";

/** Campus-local opening hours per weekday, e.g. { monday: { open: "08:00", close: "20:00" } }. */
export type OpeningHours = Partial<
  Record<DayOfWeek, { open: string; close: string }>
>;

export type Room = {
  id: string;
  name: string;
  location: string;
  capacity: number;
  amenities: string[];
  openingHours: OpeningHours;
};
