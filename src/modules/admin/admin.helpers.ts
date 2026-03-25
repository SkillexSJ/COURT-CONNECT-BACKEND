export const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Parses a value into a number of days
export const parseDays = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 180;
  return Math.min(365, parsed);
};

// Parses a value into a number used for amounts
export const asAmount = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

// Formats a date into a "YYYY-MM" string for grouping
export const formatMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

// Formats a "YYYY-MM" month key ifor better display
export const formatMonthLabel = (monthKey: string) => {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number.parseInt(yearStr ?? "0", 10);
  const month = Number.parseInt(monthStr ?? "1", 10) - 1;
  const date = new Date(year, month, 1);

  return date.toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
  });
};
