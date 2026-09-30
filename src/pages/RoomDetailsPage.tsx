import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getRooms } from "../services/api";
import type { Room } from "../types/room";

function RoomDetailsPage() {
  const { roomId } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRoom() {
      try {
        const rooms = await getRooms();
        const selectedRoom = rooms.find((item) => item.id === roomId);

        if (!selectedRoom) {
          setError("Room not found.");
          return;
        }

        setRoom(selectedRoom);
      } catch {
        setError("Unable to load room details.");
      } finally {
        setLoading(false);
      }
    }

    loadRoom();
  }, [roomId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-600">Loading room details...</p>
      </main>
    );
  }

  if (error || !room) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/rooms"
            className="mb-6 inline-block text-blue-600 hover:underline"
          >
            ← Back to rooms
          </Link>

          <h1 className="text-3xl font-bold text-slate-900">Room Not Found</h1>

          <p className="mt-2 text-slate-600">
            {error || "This room is not available."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/rooms"
          className="mb-6 inline-block text-blue-600 hover:underline"
        >
          ← Back to rooms
        </Link>

        <div className="rounded-lg bg-white p-8 shadow">
          <h1 className="mb-6 text-3xl font-bold text-slate-900">
            {room.name}
          </h1>

          <div className="space-y-4">
            <p className="text-slate-600">
              <span className="font-semibold text-slate-900">Location:</span>{" "}
              {room.location}
            </p>

            <p className="text-slate-600">
              <span className="font-semibold text-slate-900">Capacity:</span>{" "}
              {room.capacity}
            </p>

            <div>
              <h2 className="mb-2 font-semibold text-slate-900">Amenities</h2>

              <ul className="list-inside list-disc text-slate-600">
                {room.amenities.map((amenity) => (
                  <li key={amenity}>{amenity}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default RoomDetailsPage;
