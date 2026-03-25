/**
 * Common  Functions
 */

/**
 * Round money to 2 decimal places and return as a number.
 */
export const roundMoney = (value: number | string): number => {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(numeric)) return 0;
  return Number(numeric.toFixed(2));
};

/**
 * Coerce an unknown value into a number.
 */
export const asNumber = (value: unknown, defaultValue = 0): number => {
  const numeric = Number(value ?? defaultValue);
  return Number.isFinite(numeric) ? numeric : defaultValue;
};

/**
 * Ensure  day range is within safe bounds (1 to 365).
 */
export const clampDays = (days: unknown, defaultDays = 90): number => {
  const parsed = Number.parseInt(String(days ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultDays;
  return Math.min(365, parsed);
};
