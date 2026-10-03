import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/authService";
import { RegistrationError, type RegisterFieldErrors } from "../types/auth";
import {
  EMPTY_REGISTER_FORM,
  hasValidationErrors,
  PASSWORD_MIN_LENGTH,
  validateRegisterForm,
  type RegisterFormValues,
} from "../validation/registerValidation";

const SUCCESS_REDIRECT_DELAY_MS = 1200;

const fieldClassName =
  "w-full rounded-md border px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500";

function inputClassName(hasError: boolean) {
  return `${fieldClassName} ${
    hasError ? "border-red-500 bg-red-50" : "border-slate-300"
  }`;
}

function RegisterPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<RegisterFormValues>(
    EMPTY_REGISTER_FORM,
  );
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Briefly show the confirmation, then move on to the signed-in screen.
  // The timer is cleared on unmount so it cannot navigate a dead component.
  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, SUCCESS_REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [successMessage, navigate]);

  function updateField(field: keyof RegisterFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));

    // Clear this field's error as soon as the user edits it.
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];

      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateRegisterForm(values);

    if (hasValidationErrors(validationErrors)) {
      setFieldErrors(validationErrors);
      setFormError("Please correct the highlighted fields.");

      return;
    }

    setFieldErrors({});
    setFormError("");
    setSubmitting(true);

    try {
      const result = await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });

      // Clear the form so the passwords are not left in component state.
      setValues(EMPTY_REGISTER_FORM);
      setSuccessMessage(result.message || "Your account has been created.");
    } catch (error) {
      if (error instanceof RegistrationError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow">
          <h1 className="mb-4 text-3xl font-bold text-slate-900">
            Account Created
          </h1>

          <p role="status" className="text-green-700">
            {successMessage}
          </p>

          <p className="mt-4 text-slate-600">
            Taking you to your dashboard...
          </p>

          <Link
            to="/dashboard"
            className="mt-6 inline-block text-blue-600 hover:underline"
          >
            Continue now
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">
          Create your account
        </h1>

        <p className="mb-6 text-slate-600">
          Register to reserve and manage campus rooms.
        </p>

        {formError && (
          <p
            role="alert"
            className="mb-4 rounded-md bg-red-50 p-3 text-red-700"
          >
            {formError}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="mb-1 block font-medium text-slate-800"
            >
              Full name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={values.name}
              onChange={(event) => updateField("name", event.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
              className={inputClassName(Boolean(fieldErrors.name))}
            />

            {fieldErrors.name && (
              <p id="name-error" className="mt-1 text-sm text-red-600">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1 block font-medium text-slate-800"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(event) => updateField("email", event.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              className={inputClassName(Boolean(fieldErrors.email))}
            />

            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="password"
              className="mb-1 block font-medium text-slate-800"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={(event) => updateField("password", event.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "password-error" : "password-hint"
              }
              className={inputClassName(Boolean(fieldErrors.password))}
            />

            {fieldErrors.password ? (
              <p id="password-error" className="mt-1 text-sm text-red-600">
                {fieldErrors.password}
              </p>
            ) : (
              <p id="password-hint" className="mt-1 text-sm text-slate-500">
                At least {PASSWORD_MIN_LENGTH} characters, with an uppercase
                letter, a lowercase letter, and a number.
              </p>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="mb-1 block font-medium text-slate-800"
            >
              Confirm password
            </label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={(event) =>
                updateField("confirmPassword", event.target.value)
              }
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              aria-describedby={
                fieldErrors.confirmPassword
                  ? "confirmPassword-error"
                  : undefined
              }
              className={inputClassName(Boolean(fieldErrors.confirmPassword))}
            />

            {fieldErrors.confirmPassword && (
              <p
                id="confirmPassword-error"
                className="mt-1 text-sm text-red-600"
              >
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-slate-600">
          <Link to="/rooms" className="text-blue-600 hover:underline">
            Browse rooms without an account
          </Link>
        </p>
      </div>
    </main>
  );
}

export default RegisterPage;
