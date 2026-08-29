/**
 * Payroll Domain Service
 * Encapsulates salary calculations, advance settlements, and payroll deductions.
 * Follows deep-module principles: small interface, strong invariant enforcement.
 */

export type NumericValue = number | string | { toString(): string } | null | undefined;

export interface AdvanceItem {
  id?: string;
  amount: NumericValue;
}

export interface BonusItem {
  id?: string;
  amount: NumericValue;
}

export interface CalculatePayrollParams {
  monthlySalary: NumericValue;
  bonuses?: BonusItem[];
  advances?: AdvanceItem[];
  otherDeductions?: NumericValue;
}

export interface PayrollCalculationResult {
  baseSalary: number;
  totalBonuses: number;
  totalAdvances: number;
  otherDeductions: number;
  netPaidAmount: number;
}

function parseNumber(val: NumericValue): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = typeof val === "string" ? val : val.toString();
  const parsed = Number(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculates month-end employee payroll settlement figures.
 * Invariant: Net Payable = max(0, Base Salary + Bonuses - Advances - Other Deductions)
 */
export function calculatePayrollSettlement(
  params: CalculatePayrollParams
): PayrollCalculationResult {
  const baseSalary = Math.max(0, parseNumber(params.monthlySalary));

  const totalBonuses = (params.bonuses || []).reduce(
    (acc, b) => acc + Math.max(0, parseNumber(b.amount)),
    0
  );

  const totalAdvances = (params.advances || []).reduce(
    (acc, a) => acc + Math.max(0, parseNumber(a.amount)),
    0
  );

  const otherDeductions = Math.max(0, parseNumber(params.otherDeductions));

  const grossEarnings = baseSalary + totalBonuses;
  const totalDeductions = totalAdvances + otherDeductions;
  const netPaidAmount = Math.max(0, Math.round((grossEarnings - totalDeductions) * 100) / 100);

  return {
    baseSalary,
    totalBonuses,
    totalAdvances,
    otherDeductions,
    netPaidAmount,
  };
}
