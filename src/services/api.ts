import type { Room } from "../types/room";

const CAMPUS_SYNC_BE_API_BASE_URL =
  import.meta.env.VITE_CAMPUS_SYNC_BE_API_BASE_URL;

export async function getRooms(): Promise<Room[]> {
  const response = await fetch(`${CAMPUS_SYNC_BE_API_BASE_URL}/api/rooms`);

  if (!response.ok) {
    throw new Error("Failed to fetch rooms");
  }

  return response.json();
}