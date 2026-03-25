export type SlotWindow = {
  key: "LATE_NIGHT" | "EARLY_MORNING" | "MORNING" | "AFTERNOON" | "EVENING";
  label: string;
  startMinute: number;
  endMinute: number;
};

export const SLOT_WINDOWS: SlotWindow[] = [
  { key: "LATE_NIGHT", label: "00:00 - 06:00", startMinute: 0, endMinute: 360 },
  {
    key: "EARLY_MORNING",
    label: "06:00 - 09:00",
    startMinute: 360,
    endMinute: 540,
  },
  { key: "MORNING", label: "09:00 - 12:00", startMinute: 540, endMinute: 720 },
  {
    key: "AFTERNOON",
    label: "12:00 - 16:00",
    startMinute: 720,
    endMinute: 960,
  },
  { key: "EVENING", label: "16:00 - 24:00", startMinute: 960, endMinute: 1440 },
];

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
