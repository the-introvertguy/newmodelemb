import { describe, it, expect } from "vitest";
import { calculatePayrollSettlement } from "./payroll.service";

describe("Payroll Service", () => {
  it("calculates net salary with no advances or bonuses", () => {
    const result = calculatePayrollSettlement({
      monthlySalary: 25000,
      bonuses: [],
      advances: [],
      otherDeductions: 0,
    });

    expect(result).toEqual({
      baseSalary: 25000,
      totalBonuses: 0,
      totalAdvances: 0,
      otherDeductions: 0,
      netPaidAmount: 25000,
    });
  });

  it("calculates net salary with bonuses added and advances deducted", () => {
    const result = calculatePayrollSettlement({
      monthlySalary: 30000,
      bonuses: [{ amount: 5000 }, { amount: 2500 }],
      advances: [{ amount: 4000 }, { amount: 1000 }],
      otherDeductions: 500,
    });

    // Gross: 30000 + 7500 = 37500
    // Deductions: 5000 + 500 = 5500
    // Net: 37500 - 5500 = 32000
    expect(result.baseSalary).toBe(30000);
    expect(result.totalBonuses).toBe(7500);
    expect(result.totalAdvances).toBe(5000);
    expect(result.otherDeductions).toBe(500);
    expect(result.netPaidAmount).toBe(32000);
  });

  it("clamps net payable amount to 0 if deductions exceed earnings", () => {
    const result = calculatePayrollSettlement({
      monthlySalary: 20000,
      bonuses: [],
      advances: [{ amount: 25000 }],
      otherDeductions: 2000,
    });

    expect(result.netPaidAmount).toBe(0);
  });

  it("handles string numeric inputs gracefully", () => {
    const result = calculatePayrollSettlement({
      monthlySalary: "22000",
      bonuses: [{ amount: "3000" }],
      advances: [{ amount: "5000" }],
      otherDeductions: "1000",
    });

    expect(result.baseSalary).toBe(22000);
    expect(result.totalBonuses).toBe(3000);
    expect(result.totalAdvances).toBe(5000);
    expect(result.otherDeductions).toBe(1000);
    expect(result.netPaidAmount).toBe(19000);
  });

  it("handles invalid or missing inputs without throwing", () => {
    const result = calculatePayrollSettlement({
      monthlySalary: -5000,
      bonuses: undefined,
      advances: undefined,
      otherDeductions: undefined,
    });

    expect(result.baseSalary).toBe(0);
    expect(result.totalBonuses).toBe(0);
    expect(result.totalAdvances).toBe(0);
    expect(result.otherDeductions).toBe(0);
    expect(result.netPaidAmount).toBe(0);
  });
});
