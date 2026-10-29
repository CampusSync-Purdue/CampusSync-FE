import type { SlotState, TimelineSlot } from "../../validation/bookingValidation";
import { formatTimeLabel } from "../../utils/campusTime";

interface AvailabilityTimelineProps {
  slots: TimelineSlot[];
  selectedStart: string;
  selectedEnd: string;
  disabled: boolean;
  onSelect: (slot: TimelineSlot) => void;
}

const STATE_LABELS: Record<SlotState, string> = {
  available: "available",
  booked: "booked",
  mine: "your booking",
  past: "past",
};

const STATE_CLASSES: Record<SlotState, string> = {
  available: "bg-green-500 hover:bg-green-600 cursor-pointer",
  booked: "bg-red-500 cursor-not-allowed",
  mine: "bg-purple-500 cursor-not-allowed",
  past: "bg-slate-200 cursor-not-allowed",
};

const LEGEND: Array<{ label: string; className: string }> = [
  { label: "Available", className: "bg-green-500" },
  { label: "Booked", className: "bg-red-500" },
  { label: "Your booking", className: "bg-purple-500" },
  { label: "Your selection", className: "bg-blue-600" },
  { label: "Past", className: "bg-slate-200" },
];

/** "08:00" → "8 AM"; "13:00" → "1 PM". */
function hourLabel(time: string): string {
  return formatTimeLabel(time).replace(":00", "");
}

/**
 * A horizontal day view of 30-minute blocks. Green blocks can be clicked:
 * the first click picks the start, a later click extends the end.
 */
function AvailabilityTimeline({
  slots,
  selectedStart,
  selectedEnd,
  disabled,
  onSelect,
}: AvailabilityTimelineProps) {
  function isSelected(slot: TimelineSlot) {
    return (
      Boolean(selectedStart && selectedEnd) &&
      slot.start >= selectedStart &&
      slot.end <= selectedEnd
    );
  }

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Legend">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`inline-block size-3 rounded-sm ${item.className}`} />
            {item.label}
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[36rem]">
          <div role="group" aria-label="Availability by half hour" className="flex gap-0.5">
            {slots.map((slot) => {
              const selected = isSelected(slot) && slot.state === "available";
              const label = `${formatTimeLabel(slot.start)} to ${formatTimeLabel(slot.end)}, ${
                selected ? "selected" : STATE_LABELS[slot.state]
              }`;

              return (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => onSelect(slot)}
                  disabled={disabled || slot.state !== "available"}
                  aria-label={label}
                  aria-pressed={slot.state === "available" ? selected : undefined}
                  title={label}
                  className={`h-10 flex-1 rounded-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:opacity-100 ${
                    selected ? "bg-blue-600 hover:bg-blue-700" : STATE_CLASSES[slot.state]
                  } ${disabled && slot.state === "available" ? "cursor-wait opacity-60" : ""}`}
                />
              );
            })}
          </div>

          <div aria-hidden="true" className="mt-1 flex gap-0.5 text-[10px] text-slate-500">
            {slots.map((slot) => (
              <span key={slot.start} className="flex-1 whitespace-nowrap">
                {slot.start.endsWith(":00") ? hourLabel(slot.start) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AvailabilityTimeline;
