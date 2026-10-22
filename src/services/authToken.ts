/**
 * Where the auth token lives.
 *
 * Both the auth context, which writes it, and the API layer, which sends it,
 * need this key. It is defined here so the literal is not repeated and the
 * two can never drift apart.
 */
export const AUTH_TOKEN_KEY = "campussync_auth_token";
export const AUTH_USER_KEY = "campussync_auth_user";

/** The stored token, or null when nobody is signed in. */
export function readAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/** An Authorization header when a token is stored, or nothing when it is not. */
export function authHeaders(): Record<string, string> {
  const token = readAuthToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}
