// Shared formatting / comparison helpers for pipeline components.
// HubSpot returns dates as ISO strings, epoch-ms strings, or YYYY-MM-DD.

export type SortDirection = "asc" | "desc";

export const fmtCurrency = (n: number) => `$${n.toLocaleString()}`;

export const dateValue = (value: string | null) => {
  if (!value) return null;

  if (/^\d+$/.test(value)) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const fmtDate = (value: string | null) => {
  const ms = dateValue(value);
  if (ms === null) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
};

export const compareText = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

export const compareNullable = (
  aValue: number | string | null,
  bValue: number | string | null,
  direction: SortDirection,
) => {
  const aMissing = aValue === null || aValue === "";
  const bMissing = bValue === null || bValue === "";

  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  const result =
    typeof aValue === "string" && typeof bValue === "string"
      ? compareText(aValue, bValue)
      : Number(aValue) - Number(bValue);

  return direction === "asc" ? result : -result;
};
