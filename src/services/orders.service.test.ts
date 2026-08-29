import { describe, it, expect } from "vitest";
import {
  calculateOrderItemTotal,
  calculateOrderSummary,
  formatOrderNumber,
} from "./orders.service";

describe("Order Domain Service", () => {
  describe("calculateOrderItemTotal", () => {
    it("calculates exact piece multiplication", () => {
      expect(calculateOrderItemTotal(300, 60)).toBe(18000);
      expect(calculateOrderItemTotal(150, 45.5)).toBe(6825);
    });

    it("handles zero or missing values safely", () => {
      expect(calculateOrderItemTotal(0, 100)).toBe(0);
      expect(calculateOrderItemTotal(-5, 50)).toBe(0);
    });
  });

  describe("calculateOrderSummary", () => {
    it("aggregates multiple order items with total quantity and amount", () => {
      const items = [
        { productType: "Polo Shirt", quantity: 200, unitPrice: 75 }, // 15000
        { productType: "Kurti", quantity: 300, unitPrice: 120 }, // 36000
        { productType: "Cap", quantity: 500, unitPrice: 35 }, // 17500
      ];

      const summary = calculateOrderSummary(items);

      expect(summary.totalQuantity).toBe(1000);
      expect(summary.totalAmount).toBe(68500);
      expect(summary.items[0].totalPrice).toBe(15000);
      expect(summary.items[1].totalPrice).toBe(36000);
      expect(summary.items[2].totalPrice).toBe(17500);
    });
  });

  describe("formatOrderNumber", () => {
    it("formats sequential monthly order numbers matching YYYYMM0001 format", () => {
      const aug2026 = new Date(2026, 7, 15); // Month index 7 = August
      expect(formatOrderNumber(aug2026, 1)).toBe("2026080001");
      expect(formatOrderNumber(aug2026, 42)).toBe("2026080042");
      expect(formatOrderNumber(aug2026, 1050)).toBe("2026081050");
    });
  });
});
