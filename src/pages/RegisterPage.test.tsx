import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./RegisterPage";
import { register } from "../services/authService";
import { RegistrationError } from "../types/auth";

vi.mock("../services/authService", () => ({
  register: vi.fn(),
}));

const registerMock = vi.mocked(register);

const createdUser = {
  id: "11111111-2222-3333-4444-555555555555",
  name: "Varun Teja",
  email: "varun@campussync.edu",
  role: "user" as const,
  createdAt: "2026-10-01T22:00:00.000Z",
};

const successResult = {
  message: "Your account has been created.",
  user: createdUser,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <RegisterPage />
    </MemoryRouter>,
  );
}

function submitButton() {
  return screen.getByRole("button", { name: /create account/i });
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<{
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }> = {},
) {
  const values = {
    name: "Varun Teja",
    email: "varun@campussync.edu",
    password: "Password1",
    confirmPassword: "Password1",
    ...overrides,
  };

  if (values.name) {
    await user.type(screen.getByLabelText("Full name"), values.name);
  }

  if (values.email) {
    await user.type(screen.getByLabelText("Email address"), values.email);
  }

  if (values.password) {
    await user.type(screen.getByLabelText("Password"), values.password);
  }

  if (values.confirmPassword) {
    await user.type(
      screen.getByLabelText("Confirm password"),
      values.confirmPassword,
    );
  }
}

beforeEach(() => {
  registerMock.mockReset();
});

describe("RegisterPage", () => {
  it("renders all four fields", () => {
    renderPage();

    expect(screen.getByLabelText("Full name")).toBeTruthy();
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByLabelText("Confirm password")).toBeTruthy();
  });

  it("masks both password fields", () => {
    renderPage();

    expect(screen.getByLabelText("Password").getAttribute("type")).toBe(
      "password",
    );
    expect(screen.getByLabelText("Confirm password").getAttribute("type")).toBe(
      "password",
    );
  });

  it("shows validation errors and does not call the API on an empty submit", async () => {
    const user = userEvent.setup();

    renderPage();
    await user.click(submitButton());

    expect(await screen.findByText("Name is required.")).toBeTruthy();
    expect(screen.getByText("Email address is required.")).toBeTruthy();
    expect(screen.getByText("Password is required.")).toBeTruthy();
    expect(screen.getByText("Confirm your password.")).toBeTruthy();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("blocks submission when the passwords do not match", async () => {
    const user = userEvent.setup();

    renderPage();
    await fillForm(user, { confirmPassword: "Password2" });
    await user.click(submitButton());

    expect(await screen.findByText("Passwords do not match.")).toBeTruthy();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email before calling the API", async () => {
    const user = userEvent.setup();

    renderPage();
    await fillForm(user, { email: "not-an-email" });
    await user.click(submitButton());

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeTruthy();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("rejects a weak password before calling the API", async () => {
    const user = userEvent.setup();

    renderPage();
    await fillForm(user, { password: "abc", confirmPassword: "abc" });
    await user.click(submitButton());

    expect(
      await screen.findByText(/Password must be at least 8 characters/),
    ).toBeTruthy();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("clears a field error once the user edits that field", async () => {
    const user = userEvent.setup();

    renderPage();
    await user.click(submitButton());

    expect(await screen.findByText("Name is required.")).toBeTruthy();

    await user.type(screen.getByLabelText("Full name"), "Varun");

    expect(screen.queryByText("Name is required.")).toBeNull();
  });

  it("marks invalid fields with aria-invalid", async () => {
    const user = userEvent.setup();

    renderPage();
    await user.click(submitButton());

    await waitFor(() => {
      expect(
        screen.getByLabelText("Email address").getAttribute("aria-invalid"),
      ).toBe("true");
    });
  });

  it("submits trimmed values and omits the confirmation field", async () => {
    registerMock.mockResolvedValue(successResult);

    const user = userEvent.setup();

    renderPage();
    await fillForm(user, {
      name: "  Varun Teja  ",
      email: "  varun@campussync.edu  ",
    });
    await user.click(submitButton());

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith({
        name: "Varun Teja",
        email: "varun@campussync.edu",
        password: "Password1",
      });
    });
  });

  it("shows a submitting state while the request is in flight", async () => {
    let resolveRegister: (value: typeof successResult) => void = () => {};

    registerMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRegister = resolve;
      }),
    );

    const user = userEvent.setup();

    renderPage();
    await fillForm(user);
    await user.click(submitButton());

    const pendingButton = await screen.findByRole("button", {
      name: /creating account/i,
    });

    expect(pendingButton).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("Full name")).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("Password")).toHaveProperty("disabled", true);

    resolveRegister(successResult);

    await screen.findByText("Your account has been created.");
  });

  it("shows a success message after registering", async () => {
    registerMock.mockResolvedValue(successResult);

    const user = userEvent.setup();

    renderPage();
    await fillForm(user);
    await user.click(submitButton());

    expect(
      await screen.findByText("Your account has been created."),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Account Created" }),
    ).toBeTruthy();
  });

  it("never renders the password after a successful registration", async () => {
    registerMock.mockResolvedValue(successResult);

    const user = userEvent.setup();

    const { container } = renderPage();
    await fillForm(user);
    await user.click(submitButton());

    await screen.findByText("Your account has been created.");

    expect(container.textContent).not.toContain("Password1");
    expect(container.querySelector("input[type=password]")).toBeNull();
  });

  it("shows a field error returned by the backend", async () => {
    const message = "An account with this email address already exists.";

    registerMock.mockRejectedValue(
      new RegistrationError(message, { email: message }),
    );

    const user = userEvent.setup();

    renderPage();
    await fillForm(user);
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      message,
    );

    // Once in the form-level alert, once beside the email field.
    expect(screen.getAllByText(message).length).toBe(2);
  });

  it("re-enables the form after a failed submission", async () => {
    registerMock.mockRejectedValue(
      new RegistrationError("Unable to reach the server."),
    );

    const user = userEvent.setup();

    renderPage();
    await fillForm(user);
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(submitButton()).toHaveProperty("disabled", false);
  });

  it("shows a generic message for an unexpected error", async () => {
    registerMock.mockRejectedValue(new Error("boom"));

    const user = userEvent.setup();

    renderPage();
    await fillForm(user);
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Something went wrong. Please try again.",
    );
  });

  it("keeps the entered values after a failed submission", async () => {
    registerMock.mockRejectedValue(
      new RegistrationError("Unable to reach the server."),
    );

    const user = userEvent.setup();

    renderPage();
    await fillForm(user);
    await user.click(submitButton());

    await screen.findByRole("alert");

    expect(screen.getByLabelText("Full name")).toHaveProperty(
      "value",
      "Varun Teja",
    );
    expect(screen.getByLabelText("Email address")).toHaveProperty(
      "value",
      "varun@campussync.edu",
    );
  });
});
