import { describe, it, expect } from "vitest";
import { calculateInvoiceTotals } from "./invoicing.service";

describe("Invoicing Service", () => {
  it("calculates invoice totals with no discount and no advance", () => {
    const items = [
      { quantity: 100, unitPrice: 60 },
      { quantity: 200, unitPrice: 50 },
    ];

    const result = calculateInvoiceTotals({
      items,
      discount: 0,
      advanceReceived: 0,
    });

    expect(result.subtotal).toBe(16000);
    expect(result.discount).toBe(0);
    expect(result.advanceReceived).toBe(0);
    expect(result.grandTotal).toBe(16000);
    expect(result.inWords).toBe("Sixteen Thousand Taka Only");
  });

  it("applies discounts and advance payments correctly", () => {
    const items = [
      { quantity: 500, unitPrice: 80 }, // 40000
      { quantity: 100, unitPrice: 100 }, // 10000
    ];

    const result = calculateInvoiceTotals({
      items,
      discount: 1500,
      advanceReceived: 10000,
    });

    // Subtotal: 50000
    // Grand Total: 50000 - 1500 - 10000 = 38500
    expect(result.subtotal).toBe(50000);
    expect(result.discount).toBe(1500);
    expect(result.advanceReceived).toBe(10000);
    expect(result.grandTotal).toBe(38500);
    expect(result.inWords).toBe("Thirty Eight Thousand Five Hundred Taka Only");
  });

  it("clamps grand total to zero if discount + advance exceeds subtotal", () => {
    const items = [{ quantity: 10, unitPrice: 50 }]; // 500

    const result = calculateInvoiceTotals({
      items,
      discount: 200,
      advanceReceived: 500,
    });

    expect(result.subtotal).toBe(500);
    expect(result.grandTotal).toBe(0);
    expect(result.inWords).toBe("Zero Taka Only");
  });
});
