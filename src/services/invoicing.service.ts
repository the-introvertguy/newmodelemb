/**
 * Invoicing Domain Service
 * Encapsulates invoice item summation, discount and advance deductions, grand total calculations,
 * and automated Taka in Words generation.
 * Follows deep-module principles: small interface, strong invariant enforcement.
 */

import { numberToWordsTaka } from "@/lib/utils";

export type NumericValue = number | string | { toString(): string } | null | undefined;

export interface InvoiceItemSource {
  quantity: NumericValue;
  unitPrice: NumericValue;
  totalPrice?: NumericValue;
}

export interface CalculateInvoiceTotalsParams {
  items: InvoiceItemSource[];
  discount?: NumericValue;
  advanceReceived?: NumericValue;
}

export interface InvoiceTotalsResult {
  subtotal: number;
  discount: number;
  advanceReceived: number;
  grandTotal: number;
  inWords: string;
}

function parseNumber(val: NumericValue): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = typeof val === "string" ? val : val.toString();
  const parsed = Number(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculates complete billing figures for an invoice.
 * Invariants:
 * - Subtotal = sum of (quantity * unitPrice) for all order items
 * - Grand Total = max(0, Subtotal - Discount - AdvanceReceived)
 * - InWords = South Asian Bangladeshi numbering format (Taka and Paisa)
 */
export function calculateInvoiceTotals(params: CalculateInvoiceTotalsParams): InvoiceTotalsResult {
  const subtotal = (params.items || []).reduce((acc, item) => {
    const qty = Math.max(0, parseNumber(item.quantity));
    const price = Math.max(0, parseNumber(item.unitPrice));
    const itemTotal = item.totalPrice !== undefined ? parseNumber(item.totalPrice) : qty * price;
    return acc + itemTotal;
  }, 0);

  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const discount = Math.max(0, parseNumber(params.discount));
  const advanceReceived = Math.max(0, parseNumber(params.advanceReceived));

  const rawGrandTotal = roundedSubtotal - discount - advanceReceived;
  const grandTotal = Math.max(0, Math.round(rawGrandTotal * 100) / 100);
  const inWords = numberToWordsTaka(grandTotal);

  return {
    subtotal: roundedSubtotal,
    discount,
    advanceReceived,
    grandTotal,
    inWords,
  };
}
