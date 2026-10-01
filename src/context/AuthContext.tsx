import { useMemo, useState, type ReactNode } from "react"
import { loginUser, logoutUser } from "../services/authService"
import { authContext } from "./authContext"
import type {
  AuthContextType,
  AuthResponse,
  LoginCredentials,
  User,
} from "../types/auth"

const AUTH_TOKEN_KEY = "campussync_auth_token"
const AUTH_USER_KEY = "campussync_auth_user"

interface AuthProviderProps {
  children: ReactNode
}

function readStoredUser(): User | null {
  const storedUser = localStorage.getItem(AUTH_USER_KEY)

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser) as User
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(readStoredUser)

  async function login(credentials: LoginCredentials): Promise<void> {
    const response: AuthResponse = await loginUser(credentials)

    localStorage.setItem(AUTH_TOKEN_KEY, response.token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user))
    setUser(response.user)
  }

  async function logout(): Promise<void> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)

    try {
      await logoutUser(token)
    } finally {
      // Clear local state even if the request fails, so the user is signed out locally.
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_USER_KEY)
      setUser(null)
    }
  }

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      logout,
    }),
    [user],
  )

  return <authContext.Provider value={value}>{children}</authContext.Provider>
}
