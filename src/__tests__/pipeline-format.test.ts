/**
 * Tests for shared pipeline formatting / comparison helpers.
 */

import { describe, it, expect } from "vitest";
import { dateValue, fmtDate, compareNullable } from "@/components/pipeline/format";

describe("dateValue", () => {
  it("returns null for null input", () => {
    expect(dateValue(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(dateValue("")).toBeNull();
  });

  it("parses epoch-ms strings (HubSpot numeric dates)", () => {
    expect(dateValue("1735689600000")).toBe(1735689600000);
  });

  it("parses YYYY-MM-DD as UTC midnight", () => {
    expect(dateValue("2026-01-15")).toBe(Date.UTC(2026, 0, 15));
  });

  it("parses ISO timestamps", () => {
    expect(dateValue("2026-01-15T12:30:00Z")).toBe(Date.parse("2026-01-15T12:30:00Z"));
  });

  it("returns null for garbage", () => {
    expect(dateValue("not-a-date")).toBeNull();
  });
});

describe("fmtDate", () => {
  it("formats a date-only string in UTC", () => {
    expect(fmtDate("2026-01-15")).toBe("Jan 15, 2026");
  });

  it("returns an em dash for null", () => {
    expect(fmtDate(null)).toBe("—");
  });

  it("returns an em dash for unparseable input", () => {
    expect(fmtDate("nope")).toBe("—");
  });
});

describe("compareNullable", () => {
  it("sorts numbers ascending", () => {
    expect(compareNullable(1, 2, "asc")).toBeLessThan(0);
    expect(compareNullable(2, 1, "asc")).toBeGreaterThan(0);
  });

  it("sorts numbers descending", () => {
    expect(compareNullable(1, 2, "desc")).toBeGreaterThan(0);
  });

  it("always sorts nulls last regardless of direction", () => {
    expect(compareNullable(null, 1, "asc")).toBeGreaterThan(0);
    expect(compareNullable(null, 1, "desc")).toBeGreaterThan(0);
    expect(compareNullable(1, null, "desc")).toBeLessThan(0);
  });

  it("treats two nulls as equal", () => {
    expect(compareNullable(null, null, "asc")).toBe(0);
  });

  it("compares strings case-insensitively", () => {
    expect(compareNullable("apple", "Banana", "asc")).toBeLessThan(0);
  });
});
