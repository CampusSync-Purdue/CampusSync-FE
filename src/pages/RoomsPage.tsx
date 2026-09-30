import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRooms } from "../services/api";
import type { Room } from "../types/room";

function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRooms() {
      try {
        const data = await getRooms();
        setRooms(data);
      } catch {
        setError("Unable to load rooms. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadRooms();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <h1 className="mb-6 text-3xl font-bold text-slate-900">
          Available Rooms
        </h1>
        <p className="text-slate-600">Loading rooms...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <h1 className="mb-6 text-3xl font-bold text-slate-900">
          Available Rooms
        </h1>
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (rooms.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <h1 className="mb-6 text-3xl font-bold text-slate-900">
          Available Rooms
        </h1>
        <p className="text-slate-600">No rooms are currently available.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">
        Available Rooms
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Link
            key={room.id}
            to={`/rooms/${room.id}`}
            className="block rounded-lg bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="mb-2 text-xl font-semibold text-slate-900">
              {room.name}
            </h2>

            <p className="mb-2 text-slate-600">Location: {room.location}</p>

            <p className="mb-4 text-slate-600">Capacity: {room.capacity}</p>

            <div>
              <h3 className="mb-2 font-medium text-slate-800">Amenities</h3>

              <ul className="list-inside list-disc text-slate-600">
                {room.amenities.map((amenity) => (
                  <li key={amenity}>{amenity}</li>
                ))}
              </ul>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

export default RoomsPage;
