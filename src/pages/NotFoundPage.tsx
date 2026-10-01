import { Link } from "react-router-dom"

function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 text-slate-950">
      <section className="w-full max-w-md border-l border-slate-300 pl-6">
        <p className="text-sm font-medium text-slate-500">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The page you requested does not exist or may have moved.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
        >
          Go to dashboard
        </Link>
      </section>
    </main>
  )
}

export default NotFoundPage
