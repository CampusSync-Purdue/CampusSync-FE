import {
  TIME_STEP_MINUTES,
  formatTimeLabel,
  timeOptions,
} from "../../utils/timeOptions";

type TimeSelectProps = {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  /** Shown while nothing is chosen. Omit to require a choice from the start. */
  placeholder?: string;
  stepMinutes?: number;
};

/**
 * A time picker that is a plain dropdown rather than a typed-in field.
 *
 * `input type="time"` only reports a value once every segment is filled, so a
 * half-typed time reads as empty and the form says a time is required while
 * the field looks filled in. A list of fixed slots cannot be half-entered.
 *
 * The label is rendered by the caller, next to the rest of its form.
 */
function TimeSelect({
  id,
  name,
  value,
  onChange,
  disabled = false,
  invalid = false,
  className,
  placeholder,
  stepMinutes = TIME_STEP_MINUTES,
}: TimeSelectProps) {
  const options = timeOptions(stepMinutes);

  // A value off the grid (one the server chose, or an older saved window)
  // still has to be selectable, or opening the form would silently change it.
  if (value && !options.includes(value)) {
    options.push(value);
    options.sort();
  }

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      aria-invalid={invalid}
      className={className}
    >
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}

      {options.map((option) => (
        <option key={option} value={option}>
          {formatTimeLabel(option)}
        </option>
      ))}
    </select>
  );
}

export default TimeSelect;
