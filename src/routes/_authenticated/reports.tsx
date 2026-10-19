import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { productsQ, salesQ, movementsQ, useMoney } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — MyPhone Manager" }] }),
  component: Reports,
});

function Reports() {
  const { data: products = [] } = useQuery(productsQ);
  const { data: sales = [] } = useQuery(salesQ);
  const { data: movements = [] } = useQuery(movementsQ);
  const money = useMoney();

  // Sample records should never be represented as actual business performance.
  const realProducts = products.filter((p) => !p.is_sample);
  const completedSales = sales.filter((s) => s.status === "completed" && !s.is_sample);
  const revenue = completedSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const cost = completedSales.reduce((sum, sale) => sum + Number(sale.total_cost), 0);
  const stockCost = realProducts.reduce((sum, p) => sum + Number(p.purchase_price) * p.quantity, 0);
  const stockRetail = realProducts.reduce((sum, p) => sum + Number(p.sale_price) * p.quantity, 0);

  const soldByProduct = new Map<string, { name: string; units: number }>();
  for (const sale of completedSales) {
    for (const line of sale.sale_lines) {
      const id = line.product_id ?? line.product_name;
      const previous = soldByProduct.get(id);
      soldByProduct.set(id, { name: line.product_name, units: (previous?.units ?? 0) + line.quantity });
    }
  }
  const top = [...soldByProduct.values()].sort((a, b) => b.units - a.units).slice(0, 5);
  const activeMovements = movements.filter((m) => !m.is_sample).slice(0, 15);

  const cards = [
    { label: "Stock value (cost)", value: money(stockCost, { lbp: false }), icon: Package },
    { label: "Potential stock sales", value: money(stockRetail, { lbp: false }), icon: BarChart3 },
    { label: "Sales revenue", value: money(revenue, { lbp: false }), icon: ShoppingCart },
    { label: "Gross profit on sales", value: money(revenue - cost, { lbp: false }), icon: TrendingUp },
  ];

  return (
    <>
      <PageHeader title="Reports" subtitle="A simple view of your inventory and recorded sales. Sample data is excluded." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              {card.label}<card.icon className="size-4 shrink-0" />
            </div>
            <div className="mt-2 text-xl font-semibold tabular">{card.value}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Sales calculations cover the latest 500 recorded sales, excluding returns and sample records. Gross profit does not include rent, salaries, or other expenses.
      </p>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border bg-card">
          <h2 className="border-b px-4 py-3 font-semibold">Best-selling products</h2>
          {top.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Record your first real sale to see your best sellers.</p>
          ) : (
            <ul className="divide-y">
              {top.map((item, index) => (
                <li key={index} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <span>{item.name}</span><span className="shrink-0 font-medium tabular">{item.units} sold</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-lg border bg-card">
          <h2 className="border-b px-4 py-3 font-semibold">Recent stock activity</h2>
          {activeMovements.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No stock movements recorded yet.</p>
          ) : (
            <ul className="divide-y">
              {activeMovements.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{m.product_name}</div>
                    <div className="text-xs text-muted-foreground">{m.type} · {new Date(m.occurred_at).toLocaleString()}</div>
                  </div>
                  <span className="shrink-0 tabular">{m.quantity_change > 0 ? "+" : ""}{m.quantity_change}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
