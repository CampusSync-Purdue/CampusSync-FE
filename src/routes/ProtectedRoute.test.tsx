import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { ProtectedRoute } from "./ProtectedRoute"
import { useAuth } from "../hooks/useAuth"
import type { AuthContextType, User } from "../types/auth"

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

const regularUser: User = {
  id: "user-1",
  name: "Test Student",
  email: "student@example.com",
  role: "user",
}

const administrator: User = {
  id: "admin-1",
  name: "Test Administrator",
  email: "admin@example.com",
  role: "admin",
}

function mockAuth(user: User | null) {
  mockedUseAuth.mockReturnValue({
    user,
    isAuthenticated: user !== null,
    login: vi.fn(),
    logout: vi.fn(),
  } satisfies AuthContextType)
}

function renderProtectedRoute(requiredRole?: "user" | "admin") {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route element={<ProtectedRoute requiredRole={requiredRole} />}>
          <Route path="/admin" element={<div>Admin Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ProtectedRoute role authorization", () => {
  it("redirects unauthenticated visitors to login", () => {
    mockAuth(null)
    renderProtectedRoute("admin")

    expect(screen.getByText("Login Page")).toBeTruthy()
    expect(screen.queryByText("Admin Page")).toBeNull()
  })

  it("redirects regular users away from admin-only pages", () => {
    mockAuth(regularUser)
    renderProtectedRoute("admin")

    expect(screen.getByText("Dashboard Page")).toBeTruthy()
    expect(screen.queryByText("Admin Page")).toBeNull()
  })

  it("allows administrators to access admin-only pages", () => {
    mockAuth(administrator)
    renderProtectedRoute("admin")

    expect(screen.getByText("Admin Page")).toBeTruthy()
  })

  it("allows regular users to access routes without role restrictions", () => {
    mockAuth(regularUser)
    renderProtectedRoute()

    expect(screen.getByText("Admin Page")).toBeTruthy()
  })
})
