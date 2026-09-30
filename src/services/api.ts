import type { Room } from "../types/room";

const API_BASE_URL = "http://localhost:5050";

export async function getRooms(): Promise<Room[]> {
  const response = await fetch(`${API_BASE_URL}/api/rooms`);

  if (!response.ok) {
    throw new Error("Failed to fetch rooms");
  }

  return response.json();
}
