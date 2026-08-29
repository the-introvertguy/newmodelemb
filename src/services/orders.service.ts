/**
 * Order Domain Service
 * Encapsulates order line item calculations, order totals, and monthly sequence numbers.
 * Follows deep-module principles: small interface, strong invariant enforcement.
 */

export type NumericValue = number | string | { toString(): string } | null | undefined;

export interface OrderItemInput {
  productType: string;
  styleRef?: string | null;
  designReference?: string | null;
  quantity: NumericValue;
  unitPrice: NumericValue;
  notes?: string | null;
}

export interface CalculatedOrderItem {
  productType: string;
  styleRef: string;
  designReference: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
}

export interface OrderFinancialSummary {
  items: CalculatedOrderItem[];
  totalQuantity: number;
  totalAmount: number;
}

function parseNumber(val: NumericValue): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = typeof val === "string" ? val : val.toString();
  const parsed = Number(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculates a single order item's total price.
 * Invariant: totalPrice = quantity * unitPrice (rounded to 2 decimal places)
 */
export function calculateOrderItemTotal(quantity: NumericValue, unitPrice: NumericValue): number {
  const qty = Math.max(0, parseNumber(quantity));
  const price = Math.max(0, parseNumber(unitPrice));
  return Math.round(qty * price * 100) / 100;
}

/**
 * Calculates total pieces and financial total for all line items in an order.
 */
export function calculateOrderSummary(items: OrderItemInput[]): OrderFinancialSummary {
  let totalQuantity = 0;
  let totalAmount = 0;

  const calculatedItems: CalculatedOrderItem[] = (items || []).map((item) => {
    const qty = Math.max(0, parseNumber(item.quantity));
    const price = Math.max(0, parseNumber(item.unitPrice));
    const totalPrice = calculateOrderItemTotal(qty, price);

    totalQuantity += qty;
    totalAmount += totalPrice;

    return {
      productType: item.productType,
      styleRef: item.styleRef || "—",
      designReference: item.designReference || "",
      quantity: qty,
      unitPrice: price,
      totalPrice,
      notes: item.notes || null,
    };
  });

  return {
    items: calculatedItems,
    totalQuantity,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Formats order number based on year, month, and sequence number.
 * Format: YYYYMM0001 (e.g. 2026080001)
 */
export function formatOrderNumber(date: Date, sequence: number): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.max(1, sequence)).padStart(4, "0");
  return `${year}${month}${seq}`;
}
