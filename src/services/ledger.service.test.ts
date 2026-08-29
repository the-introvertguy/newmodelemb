import { describe, it, expect } from "vitest";
import {
  calculateNextRunningBalance,
  recomputeLedgerSequence,
  summarizeLedgerEntries,
} from "./ledger.service";

describe("Buyer Ledger Service", () => {
  describe("calculateNextRunningBalance", () => {
    it("increases running balance on debit (order receivable)", () => {
      const balance = calculateNextRunningBalance(5000, {
        debitAmount: 12000,
        creditAmount: 0,
      });
      expect(balance).toBe(17000);
    });

    it("decreases running balance on credit (payment received)", () => {
      const balance = calculateNextRunningBalance(17000, {
        debitAmount: 0,
        creditAmount: 10000,
      });
      expect(balance).toBe(7000);
    });

    it("handles initial zero balance correctly", () => {
      const balance = calculateNextRunningBalance(0, {
        debitAmount: 8500,
        creditAmount: 0,
      });
      expect(balance).toBe(8500);
    });

    it("allows negative running balance if buyer overpays (credit balance)", () => {
      const balance = calculateNextRunningBalance(2000, {
        debitAmount: 0,
        creditAmount: 5000,
      });
      expect(balance).toBe(-3000);
    });
  });

  describe("recomputeLedgerSequence", () => {
    it("recalculates consecutive running balances in chronological order", () => {
      const transactions = [
        { id: "1", debitAmount: 10000, creditAmount: 0 },
        { id: "2", debitAmount: 5000, creditAmount: 0 },
        { id: "3", debitAmount: 0, creditAmount: 8000 },
        { id: "4", debitAmount: 2000, creditAmount: 0 },
        { id: "5", debitAmount: 0, creditAmount: 9000 },
      ];

      const sequenced = recomputeLedgerSequence(0, transactions);

      expect(sequenced.map((s) => s.runningBalance)).toEqual([
        10000, // +10000
        15000, // +5000
        7000, // -8000
        9000, // +2000
        0, // -9000
      ]);
    });
  });

  describe("summarizeLedgerEntries", () => {
    it("calculates total debits, credits, and net outstanding balance", () => {
      const entries = [
        { debitAmount: 15000, creditAmount: 0 },
        { debitAmount: 25000, creditAmount: 0 },
        { debitAmount: 0, creditAmount: 10000 },
        { debitAmount: 0, creditAmount: 20000 },
      ];

      const summary = summarizeLedgerEntries(entries);
      expect(summary).toEqual({
        totalDebit: 40000,
        totalCredit: 30000,
        netOutstanding: 10000,
      });
    });
  });
});
