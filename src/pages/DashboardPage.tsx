import { Link } from "react-router-dom"
import { LogoutButton } from "../components/common/LogoutButton"
import { useAuth } from "../hooks/useAuth"

function DashboardPage() {
  const { user } = useAuth()

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-6 text-slate-950 sm:px-10">
      <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-slate-200 pb-5">
        <p className="text-sm font-medium tracking-wide text-slate-500">CAMPUSSYNC</p>
        <LogoutButton />
      </header>

      <section className="mx-auto max-w-5xl py-20 sm:py-28">
        <p className="text-sm font-medium text-slate-500">Dashboard</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome{user?.name ? `, ${user.name}` : ""}.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
          You are signed in and ready to manage your campus spaces.
        </p>

        <nav aria-label="Quick links" className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/rooms/availability"
            className="rounded bg-slate-900 px-5 py-2 font-medium text-white transition hover:bg-slate-700"
          >
            Find a room
          </Link>

          <Link
            to="/my-bookings"
            className="rounded border border-slate-300 px-5 py-2 font-medium text-slate-900 transition hover:bg-slate-100"
          >
            My bookings
          </Link>
        </nav>
      </section>
    </main>
  )
}

export default DashboardPage
