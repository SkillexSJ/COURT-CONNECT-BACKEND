import { SLOT_WINDOWS, SlotWindow } from "./organizer.constants";

export const getSlotWindow = (startMinute: number): SlotWindow => {
  const found = SLOT_WINDOWS.find(
    (window) =>
      startMinute >= window.startMinute && startMinute < window.endMinute,
  );
  return found || SLOT_WINDOWS[SLOT_WINDOWS.length - 1]!;
};
