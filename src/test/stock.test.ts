import { describe, it, expect } from "vitest";
import { stockStatus, suggestReorder, saleTotals, marginPct } from "@/lib/stock";

describe("stock rules", () => {
  it("zero quantity is out of stock", () => expect(stockStatus(0, 3)).toBe("out"));
  it("quantity at threshold is low", () => expect(stockStatus(3, 3)).toBe("low"));
  it("quantity above threshold is ok", () => expect(stockStatus(4, 3)).toBe("ok"));
  it("reorder targets threshold plus buffer", () => {
    expect(suggestReorder(0, 4)).toBe(6); // 4 + 2
    expect(suggestReorder(1, 10)).toBe(14); // 10 + 5 - 1
  });
  it("sale profit uses recorded unit cost minus discount", () => {
    const t = saleTotals([{ quantity: 2, unit_price: 15, unit_cost: 6 }], 4);
    expect(t.total).toBe(26);
    expect(t.profit).toBe(14);
  });
  it("margin is relative to sale price", () => expect(marginPct(6, 15)).toBe(60));
});