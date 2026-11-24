import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deactivateRoom, getAdminRooms } from "../services/api";
import type { AdminRoom } from "../types/adminRoom";

function ManageRoomsPage() {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [confirmRoom, setConfirmRoom] = useState<AdminRoom | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRooms() {
      try {
        const result = await getAdminRooms();

        if (active) {
          setRooms(result);
        }
      } catch (error) {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load rooms. Please try again.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadRooms();

    return () => {
      active = false;
    };
  }, []);

  async function handleDeactivate() {
    if (!confirmRoom || deactivatingId) {
      return;
    }

    const room = confirmRoom;

    setDeactivatingId(room.id);
    setError("");
    setSuccess("");

    try {
      const result = await deactivateRoom(room.id);

      setRooms((current) =>
        current.map((existing) =>
          existing.id === room.id ? result.room : existing,
        ),
      );

      setSuccess(`${room.name} has been deactivated.`);
      setConfirmRoom(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to deactivate the room. Please try again.",
      );
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900">
          Manage Rooms
        </h1>

        <Link
          to="/admin/rooms/new"
          className="rounded bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
        >
          Add Room
        </Link>
      </div>

      <p className="mb-6 text-slate-600">
        Edit room information or deactivate rooms that should no
        longer accept new reservations.
      </p>

      {success && (
        <p role="status" className="mb-4 text-emerald-700">
          {success}
        </p>
      )}

      {error && (
        <p role="alert" className="mb-4 text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-slate-600">Loading rooms...</p>
      ) : rooms.length === 0 ? (
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-slate-600">
            No rooms have been added yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full text-left">
            <thead className="bg-slate-200 text-slate-800">
              <tr>
                <th scope="col" className="px-4 py-3">Room</th>
                <th scope="col" className="px-4 py-3">Location</th>
                <th scope="col" className="px-4 py-3">Capacity</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {room.name}
                  </td>

                  <td className="px-4 py-3 text-slate-700">
                    {room.location}
                  </td>

                  <td className="px-4 py-3 text-slate-700">
                    {room.capacity}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={
                        room.isActive
                          ? "rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800"
                          : "rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700"
                      }
                    >
                      {room.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        to={`/admin/rooms/${room.id}/edit`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        Edit
                      </Link>

                      {room.isActive && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmRoom(room);
                            setError("");
                            setSuccess("");
                          }}
                          className="font-medium text-red-700 hover:underline"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmRoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="deactivate-title"
            aria-describedby="deactivate-description"
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <h2
              id="deactivate-title"
              className="mb-3 text-xl font-bold text-slate-900"
            >
              Deactivate room?
            </h2>

            <p
              id="deactivate-description"
              className="mb-6 text-slate-700"
            >
              Are you sure you want to deactivate{" "}
              <strong>{confirmRoom.name}</strong>? The room will no
              longer appear in new booking searches. Existing
              reservation records will be preserved.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(deactivatingId)}
                onClick={() => setConfirmRoom(null)}
                className="rounded border border-slate-300 px-4 py-2 text-slate-800 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={Boolean(deactivatingId)}
                onClick={() => void handleDeactivate()}
                className="rounded bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800 disabled:opacity-60"
              >
                {deactivatingId ? "Deactivating..." : "Deactivate room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ManageRoomsPage;
