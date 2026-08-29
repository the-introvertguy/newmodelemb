/**
 * Buyer Ledger Domain Service
 * Encapsulates running balance calculations, transaction sequencing, and ledger aggregation.
 * Follows deep-module principles: small interface, strong invariant enforcement.
 */

export type NumericValue = number | string | { toString(): string } | null | undefined;

export interface LedgerEntryItem {
  id?: string;
  debitAmount?: NumericValue;
  creditAmount?: NumericValue;
  runningBalance?: NumericValue;
}

export interface LedgerSummaryResult {
  totalDebit: number;
  totalCredit: number;
  netOutstanding: number;
}

function parseNumber(val: NumericValue): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = typeof val === "string" ? val : val.toString();
  const parsed = Number(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculates updated running balance for a new ledger transaction.
 * Invariants:
 * - Debit (receivables / orders / invoices): INCREASES buyer outstanding balance (+).
 * - Credit (payments received / discounts / returns): DECREASES buyer outstanding balance (-).
 */
export function calculateNextRunningBalance(
  previousRunningBalance: NumericValue,
  entry: { debitAmount?: NumericValue; creditAmount?: NumericValue }
): number {
  const prev = parseNumber(previousRunningBalance);
  const debit = Math.max(0, parseNumber(entry.debitAmount));
  const credit = Math.max(0, parseNumber(entry.creditAmount));

  const next = prev + debit - credit;
  return Math.round(next * 100) / 100;
}

/**
 * Recomputes running balances across an ordered sequence of ledger entries (from oldest to newest).
 */
export function recomputeLedgerSequence<T extends LedgerEntryItem>(
  initialBalance: NumericValue,
  entriesAscending: T[]
): (T & { runningBalance: number })[] {
  let currentBalance = parseNumber(initialBalance);

  return entriesAscending.map((entry) => {
    currentBalance = calculateNextRunningBalance(currentBalance, entry);
    return {
      ...entry,
      runningBalance: currentBalance,
    };
  });
}

/**
 * Computes aggregated financial summaries for a collection of ledger entries.
 */
export function summarizeLedgerEntries(entries: LedgerEntryItem[]): LedgerSummaryResult {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries) {
    totalDebit += Math.max(0, parseNumber(entry.debitAmount));
    totalCredit += Math.max(0, parseNumber(entry.creditAmount));
  }

  totalDebit = Math.round(totalDebit * 100) / 100;
  totalCredit = Math.round(totalCredit * 100) / 100;
  const netOutstanding = Math.round((totalDebit - totalCredit) * 100) / 100;

  return {
    totalDebit,
    totalCredit,
    netOutstanding,
  };
}
