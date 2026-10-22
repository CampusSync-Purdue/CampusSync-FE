import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TimeSelect from "./TimeSelect";
import { formatTimeLabel, timeOptions } from "../../utils/timeOptions";

function renderSelect(props: Partial<React.ComponentProps<typeof TimeSelect>> = {}) {
  const onChange = vi.fn();

  render(
    <>
      <label htmlFor="start">Start time</label>

      <TimeSelect id="start" value="" onChange={onChange} {...props} />
    </>,
  );

  return { onChange };
}

describe("timeOptions", () => {
  it("covers the whole day on the half hour", () => {
    const options = timeOptions();

    expect(options).toHaveLength(48);
    expect(options[0]).toBe("00:00");
    expect(options[1]).toBe("00:30");
    expect(options.at(-1)).toBe("23:30");
  });

  it("honours a different step", () => {
    expect(timeOptions(60)).toHaveLength(24);
    expect(timeOptions(15)).toHaveLength(96);
  });
});

describe("formatTimeLabel", () => {
  it("reads midnight and noon the way a clock does", () => {
    expect(formatTimeLabel("00:00")).toBe("12:00 AM");
    expect(formatTimeLabel("12:00")).toBe("12:00 PM");
  });

  it("reads afternoon times in 12-hour form", () => {
    expect(formatTimeLabel("13:30")).toBe("1:30 PM");
    expect(formatTimeLabel("23:30")).toBe("11:30 PM");
  });

  it("leaves a value it cannot read alone", () => {
    expect(formatTimeLabel("")).toBe("");
  });
});

describe("TimeSelect", () => {
  it("reports the 24-hour value behind the label the user picks", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect({ placeholder: "Select a start time" });

    await user.selectOptions(screen.getByLabelText("Start time"), "14:30");

    expect(onChange).toHaveBeenCalledWith("14:30");
  });

  it("offers the choices as readable labels", () => {
    renderSelect({ placeholder: "Select a start time" });

    expect(screen.getByRole("option", { name: "2:30 PM" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Select a start time" })).toBeTruthy();
  });

  it("omits the placeholder when none is given", () => {
    renderSelect({ value: "08:00" });

    expect(screen.queryByRole("option", { name: /select/i })).toBeNull();
  });

  it("keeps a value that is not on the grid selectable", () => {
    renderSelect({ value: "09:17" });

    expect(screen.getByLabelText("Start time")).toHaveProperty("value", "09:17");
    expect(screen.getByRole("option", { name: "9:17 AM" })).toBeTruthy();
  });

  it("can be disabled", () => {
    renderSelect({ value: "08:00", disabled: true });

    expect(screen.getByLabelText("Start time")).toHaveProperty("disabled", true);
  });
});
