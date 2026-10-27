export const AUTH_TOKEN_KEY = "campussync_auth_token";

/** The signed-in user's JWT, or null when signed out. */
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}
