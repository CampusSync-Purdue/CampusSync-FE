import { afterEach, describe, expect, it, vi } from "vitest";
import { register } from "./authService";
import { RegistrationError } from "../types/auth";

const payload = {
  name: "Varun Teja",
  email: "varun@campussync.edu",
  password: "Password1",
};

const createdUser = {
  id: "11111111-2222-3333-4444-555555555555",
  name: "Varun Teja",
  email: "varun@campussync.edu",
  role: "user" as const,
  createdAt: "2026-10-01T22:00:00.000Z",
};

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("register", () => {
  it("posts JSON to the registration endpoint", async () => {
    const fetchMock = mockFetch(201, {
      message: "Your account has been created.",
      user: createdUser,
    });

    await register(payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];

    expect(String(url)).toContain("/api/auth/register");
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it("resolves with the created user on 201", async () => {
    mockFetch(201, {
      message: "Your account has been created.",
      user: createdUser,
    });

    const result = await register(payload);

    expect(result.user).toEqual(createdUser);
    expect(result.message).toBe("Your account has been created.");
  });

  it("throws a RegistrationError with field errors on 400", async () => {
    mockFetch(400, {
      message: "Please correct the highlighted fields.",
      errors: { email: "Enter a valid email address." },
    });

    await expect(register(payload)).rejects.toThrowError(RegistrationError);

    await expect(register(payload)).rejects.toMatchObject({
      message: "Please correct the highlighted fields.",
      fieldErrors: { email: "Enter a valid email address." },
    });
  });

  it("surfaces a duplicate email from a 409", async () => {
    const message = "An account with this email address already exists.";

    mockFetch(409, { message, errors: { email: message } });

    await expect(register(payload)).rejects.toMatchObject({
      message,
      fieldErrors: { email: message },
    });
  });

  it("falls back to a generic message when the body has none", async () => {
    mockFetch(500, {});

    await expect(register(payload)).rejects.toThrowError(
      /Unable to create your account right now/,
    );
  });

  it("tolerates a non-JSON error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("not json");
        },
      }),
    );

    await expect(register(payload)).rejects.toThrowError(RegistrationError);
  });

  it("ignores unexpected keys in the errors object", async () => {
    mockFetch(400, {
      message: "Please correct the highlighted fields.",
      errors: { email: "Bad email.", role: "ignored", nested: { a: 1 } },
    });

    await expect(register(payload)).rejects.toMatchObject({
      fieldErrors: { email: "Bad email." },
    });
  });

  it("reports a network failure clearly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(register(payload)).rejects.toThrowError(
      /Unable to reach the server/,
    );
  });
});
