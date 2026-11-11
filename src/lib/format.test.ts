import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime } from "./format";

describe("formatDate", () => {
  it("harus memformat tanggal dengan benar", () => {
    const result = formatDate("2026-11-11T00:00:00Z");
    expect(result).toContain("2026");
  });

  it("harus mengembalikan '-' jika tanggal kosong", () => {
    expect(formatDate("")).toBe("-");
  });
});

describe("formatDateTime", () => {
  it("harus memformat tanggal dan waktu", () => {
    const result = formatDateTime("2026-11-11T10:30:00Z");
    expect(result).toContain("2026");
  });

  it("harus mengembalikan '-' jika tanggal kosong", () => {
    expect(formatDateTime("")).toBe("-");
  });
});
