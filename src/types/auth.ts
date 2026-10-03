export type UserRole = "user" | "admin";

/** The user shape returned by the backend. It never includes password data. */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export type RegisterSuccess = {
  message: string;
  user: AuthUser;
};

/** Field-level messages keyed by form field, as returned on a 400 or 409. */
export type RegisterFieldErrors = Partial<
  Record<"name" | "email" | "password" | "confirmPassword", string>
>;

/**
 * Thrown for any non-2xx registration response. `fieldErrors` carries the
 * per-field messages from the backend so the form can show them inline.
 */
export class RegistrationError extends Error {
  readonly fieldErrors: RegisterFieldErrors;

  constructor(message: string, fieldErrors: RegisterFieldErrors = {}) {
    super(message);
    this.name = "RegistrationError";
    this.fieldErrors = fieldErrors;
  }
}
