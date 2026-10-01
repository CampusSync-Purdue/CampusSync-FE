import { useState, type ChangeEvent, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import type { LoginCredentials } from "../types/auth"

const initialCredentials: LoginCredentials = {
  email: "",
  password: "",
}

function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState<LoginCredentials>(initialCredentials)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    setCredentials((current) => ({ ...current, [name]: value }))
    setError("")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const email = credentials.email.trim()
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

    if (!email || !credentials.password) {
      setError("Enter both your email address and password.")
      return
    }

    if (!emailIsValid) {
      setError("Enter a valid email address.")
      return
    }

    setIsSubmitting(true)

    try {
      await login({ ...credentials, email })
      navigate("/dashboard", { replace: true })
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to sign in. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 py-12 text-slate-950">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 sm:p-10">
        <p className="text-sm font-medium tracking-wide text-slate-500">CAMPUSSYNC</p>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sign in to manage your campus spaces.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={credentials.email}
              onChange={handleChange}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="you@school.edu"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={handleChange}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter your password"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm leading-5 text-amber-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting && (
              <span className="mr-2 size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
