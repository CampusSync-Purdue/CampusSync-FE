import { Link } from "react-router-dom";

/**
 * Minimal signed-in landing screen, so registration has somewhere to send a
 * new user. Session handling and a personalised greeting arrive with
 * CSYNC-11 (log in and log out).
 */
function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">Dashboard</h1>

        <p className="mb-6 text-slate-600">
          Your account is ready. Browse rooms to make a reservation.
        </p>

        <Link
          to="/rooms"
          className="inline-block rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
        >
          Browse rooms
        </Link>
      </div>
    </main>
  );
}

export default DashboardPage;
