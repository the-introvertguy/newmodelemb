import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, numberToWordsTaka } from "./utils";

describe("Utility Functions", () => {
  describe("formatCurrency", () => {
    it("formats amounts in South Asian numbering with suffix symbol", () => {
      expect(formatCurrency(46500)).toBe("46,500/-");
      expect(formatCurrency(1250000)).toBe("12,50,000/-");
      expect(formatCurrency(0)).toBe("0/-");
      expect(formatCurrency(null)).toBe("0/-");
    });
  });

  describe("formatDate", () => {
    it("formats dates with custom patterns", () => {
      const date = new Date(2026, 7, 29); // 29 August 2026
      expect(formatDate(date, "dd-MM-yyyy")).toBe("29-08-2026");
      expect(formatDate(date, "d MMMM yyyy")).toBe("29 August 2026");
      expect(formatDate(null)).toBe("—");
    });
  });

  describe("numberToWordsTaka", () => {
    it("converts numbers to English words following Indian/Bangladeshi numbering", () => {
      expect(numberToWordsTaka(46500)).toBe("Forty Six Thousand Five Hundred Taka Only");
      expect(numberToWordsTaka(100000)).toBe("One Lakh Taka Only");
      expect(numberToWordsTaka(2500000)).toBe("Twenty Five Lakh Taka Only");
      expect(numberToWordsTaka(10000000)).toBe("One Crore Taka Only");
      expect(numberToWordsTaka(0)).toBe("Zero Taka Only");
      expect(numberToWordsTaka(null)).toBe("Zero Taka Only");
    });

    it("handles decimal paisa values accurately", () => {
      expect(numberToWordsTaka(46500.5)).toBe(
        "Forty Six Thousand Five Hundred Taka and Fifty Paisa Only"
      );
      expect(numberToWordsTaka(0.75)).toBe("Seventy Five Paisa Only");
    });
  });
});
