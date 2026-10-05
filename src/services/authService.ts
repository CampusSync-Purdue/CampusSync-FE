import { API_BASE_URL } from "./api";
import type { AuthResponse, LoginCredentials } from "../types/auth";

interface ErrorResponse {
  message?: string
}

async function getErrorMessage(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as ErrorResponse | null

  return data?.message ?? "Unable to complete your request. Please try again."
}

/**
 * Integration point: the backend should return `{ token, user }` from
 * POST /api/auth/login. The API base URL comes from VITE_API_BASE_URL.
 */
export async function loginUser(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  return (await response.json()) as AuthResponse
}

/** Integration point: the backend should invalidate the current token/session. */
export async function logoutUser(token: string | null): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }
}
