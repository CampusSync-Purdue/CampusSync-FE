import {
  RegistrationError,
  type RegisterFieldErrors,
  type RegisterRequest,
  type RegisterSuccess,
} from "../types/auth";

const CAMPUS_SYNC_BE_API_BASE_URL =
  import.meta.env.VITE_CAMPUS_SYNC_BE_API_BASE_URL;

const GENERIC_ERROR_MESSAGE =
  "Unable to create your account right now. Please try again.";

type ErrorResponseBody = {
  message?: unknown;
  errors?: unknown;
};

function readFieldErrors(errors: unknown): RegisterFieldErrors {
  if (!errors || typeof errors !== "object") {
    return {};
  }

  const allowedFields = ["name", "email", "password"] as const;
  const fieldErrors: RegisterFieldErrors = {};

  for (const field of allowedFields) {
    const message = (errors as Record<string, unknown>)[field];

    if (typeof message === "string" && message.length > 0) {
      fieldErrors[field] = message;
    }
  }

  return fieldErrors;
}

/**
 * Creates an account. Resolves with the new user on success and throws a
 * RegistrationError carrying per-field messages on any failure.
 */
export async function register(
  payload: RegisterRequest,
): Promise<RegisterSuccess> {
  let response: Response;

  try {
    response = await fetch(`${CAMPUS_SYNC_BE_API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Network-level failure: the request never reached the backend.
    throw new RegistrationError(
      "Unable to reach the server. Check your connection and try again.",
    );
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    // An empty or non-JSON body is not fatal: fall back to a status-based message.
    body = null;
  }

  if (!response.ok) {
    const errorBody = (body ?? {}) as ErrorResponseBody;
    const message =
      typeof errorBody.message === "string" && errorBody.message.length > 0
        ? errorBody.message
        : GENERIC_ERROR_MESSAGE;

    throw new RegistrationError(message, readFieldErrors(errorBody.errors));
  }

  return body as RegisterSuccess;
}
