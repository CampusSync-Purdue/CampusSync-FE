import { describe, expect, it } from "vitest";
import {
  EMPTY_REGISTER_FORM,
  hasValidationErrors,
  validateRegisterForm,
  type RegisterFormValues,
} from "./registerValidation";

const validForm: RegisterFormValues = {
  name: "Varun Teja",
  email: "varun@campussync.edu",
  password: "Password1",
  confirmPassword: "Password1",
};

function errorsFor(overrides: Partial<RegisterFormValues>) {
  return validateRegisterForm({ ...validForm, ...overrides });
}

describe("validateRegisterForm", () => {
  it("returns no errors for a valid form", () => {
    expect(validateRegisterForm(validForm)).toEqual({});
  });

  it("tolerates surrounding whitespace on name and email", () => {
    expect(
      errorsFor({ name: "  Varun Teja  ", email: "  varun@campussync.edu  " }),
    ).toEqual({});
  });

  it("flags every empty field on a blank form", () => {
    const errors = validateRegisterForm(EMPTY_REGISTER_FORM);

    expect(Object.keys(errors).sort()).toEqual([
      "confirmPassword",
      "email",
      "name",
      "password",
    ]);
  });

  describe("name", () => {
    it("requires a name", () => {
      expect(errorsFor({ name: "" }).name).toBe("Name is required.");
      expect(errorsFor({ name: "   " }).name).toBe("Name is required.");
    });

    it("requires at least 2 characters", () => {
      expect(errorsFor({ name: "V" }).name).toMatch(/at least 2 characters/);
    });

    it("rejects more than 100 characters", () => {
      expect(errorsFor({ name: "a".repeat(101) }).name).toMatch(
        /100 characters or fewer/,
      );
    });

    it("accepts exactly 100 characters", () => {
      expect(errorsFor({ name: "a".repeat(100) }).name).toBeUndefined();
    });
  });

  describe("email", () => {
    it("requires an email address", () => {
      expect(errorsFor({ email: "" }).email).toBe("Email address is required.");
    });

    it.each([
      "plainstring",
      "no-at-sign.edu",
      "@nolocalpart.edu",
      "missing@domain",
      "spaces in@email.edu",
      "two@@at.edu",
      "trailing@dot.",
    ])("rejects %s", (email) => {
      expect(errorsFor({ email }).email).toBe("Enter a valid email address.");
    });

    it.each([
      "varun@campussync.edu",
      "varun+test@mail.campussync.edu",
      "first.last@sub.domain.co.uk",
    ])("accepts %s", (email) => {
      expect(errorsFor({ email }).email).toBeUndefined();
    });

    it("rejects addresses over 254 characters", () => {
      const email = `${"a".repeat(250)}@test.edu`;

      expect(errorsFor({ email }).email).toMatch(/254 characters or fewer/);
    });
  });

  describe("password", () => {
    it("requires a password", () => {
      expect(errorsFor({ password: "", confirmPassword: "" }).password).toBe(
        "Password is required.",
      );
    });

    it("requires at least 8 characters", () => {
      expect(
        errorsFor({ password: "Pass1", confirmPassword: "Pass1" }).password,
      ).toMatch(/at least 8 characters/);
    });

    it("rejects more than 128 characters", () => {
      const password = `A1${"a".repeat(127)}`;

      expect(
        errorsFor({ password, confirmPassword: password }).password,
      ).toMatch(/128 characters or fewer/);
    });

    it.each([
      ["PASSWORD1", /lowercase letter/],
      ["password1", /uppercase letter/],
      ["PasswordOnly", /a number/],
    ])("rejects %s", (password, expected) => {
      expect(
        errorsFor({ password, confirmPassword: password }).password,
      ).toMatch(expected);
    });

    it("does not trim the password", () => {
      const password = " Password1 ";

      expect(
        errorsFor({ password, confirmPassword: password }).password,
      ).toBeUndefined();
    });
  });

  describe("confirmPassword", () => {
    it("requires confirmation", () => {
      expect(errorsFor({ confirmPassword: "" }).confirmPassword).toBe(
        "Confirm your password.",
      );
    });

    it("rejects a mismatch", () => {
      expect(
        errorsFor({ confirmPassword: "Password2" }).confirmPassword,
      ).toBe("Passwords do not match.");
    });

    it("is case sensitive", () => {
      expect(
        errorsFor({ confirmPassword: "password1" }).confirmPassword,
      ).toBe("Passwords do not match.");
    });

    it("accepts an exact match", () => {
      expect(errorsFor({}).confirmPassword).toBeUndefined();
    });
  });
});

describe("hasValidationErrors", () => {
  it("is false for an empty error map", () => {
    expect(hasValidationErrors({})).toBe(false);
  });

  it("is true when any field has an error", () => {
    expect(hasValidationErrors({ email: "Enter a valid email address." })).toBe(
      true,
    );
  });
});
