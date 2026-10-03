import type { RegisterFieldErrors } from "../types/auth";

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const EMAIL_MAX_LENGTH = 254;

/** Mirrors the backend pattern so the two layers agree on what is valid. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export const EMPTY_REGISTER_FORM: RegisterFormValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

/**
 * Validates the registration form. Returns a map of field name to message;
 * an empty object means the form is valid. The backend repeats these checks,
 * so this only exists to give immediate feedback.
 */
export function validateRegisterForm(
  values: RegisterFormValues,
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();

  if (name.length === 0) {
    errors.name = "Name is required.";
  } else if (name.length < NAME_MIN_LENGTH) {
    errors.name = `Name must be at least ${NAME_MIN_LENGTH} characters.`;
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (email.length === 0) {
    errors.email = "Email address is required.";
  } else if (email.length > EMAIL_MAX_LENGTH) {
    errors.email = `Email address must be ${EMAIL_MAX_LENGTH} characters or fewer.`;
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (values.password.length === 0) {
    errors.password = "Password is required.";
  } else if (values.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  } else if (values.password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  } else if (!/[a-z]/.test(values.password)) {
    errors.password = "Password must include a lowercase letter.";
  } else if (!/[A-Z]/.test(values.password)) {
    errors.password = "Password must include an uppercase letter.";
  } else if (!/[0-9]/.test(values.password)) {
    errors.password = "Password must include a number.";
  }

  if (values.confirmPassword.length === 0) {
    errors.confirmPassword = "Confirm your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function hasValidationErrors(errors: RegisterFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
