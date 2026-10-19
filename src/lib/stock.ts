export type StockStatus = "out" | "low" | "ok";

export function stockStatus(quantity: number, minStock: number): StockStatus {
  if (quantity <= 0) return "out";
  if (quantity <= minStock) return "low";
  return "ok";
}

/** Buffer added on top of the threshold: half the threshold, at least 2 units. */
export function reorderBuffer(minStock: number): number {
  return Math.max(2, Math.ceil(minStock * 0.5));
}

/** Suggested units to order so stock lands at threshold + buffer. */
export function suggestReorder(quantity: number, minStock: number): number {
  const target = minStock + reorderBuffer(minStock);
  return Math.max(1, target - Math.max(0, quantity));
}

export function marginPct(cost: number, price: number): number | null {
  if (price <= 0) return null;
  return ((price - cost) / price) * 100;
}

export interface SaleLineInput {
  quantity: number;
  unit_price: number;
  unit_cost: number;
}

export function saleTotals(lines: SaleLineInput[], discount = 0) {
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const cost = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
  const total = subtotal - discount;
  return { subtotal, cost, total, profit: total - cost };
}