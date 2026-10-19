import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, useActions } from "@/components/AppShell";
import { StatusChip, EmptyState, SampleTag } from "@/components/StatusChip";
import { productsQ, suppliersQ, movementsQ, useMoney } from "@/lib/data";
import { stockStatus, suggestReorder } from "@/lib/stock";

export const Route = createFileRoute("/_authenticated/restock")({
  head: () => ({ meta: [{ title: "Restock — MyPhone Manager" }, { name: "description", content: "What to order and restock history." }] }),
  component: Restock,
});

function Restock() {
  const { data: products = [] } = useQuery(productsQ);
  const { data: sups = [] } = useQuery(suppliersQ);
  const { data: moves = [] } = useQuery(movementsQ);
  const money = useMoney();
  const a = useActions();
  const sup = (id: string | null) => sups.find((s) => s.id === id)?.name ?? "No supplier";
  const list = products.filter((p) => stockStatus(p.quantity, p.min_stock) !== "ok").sort((x, y) => x.quantity - y.quantity);
  const est = list.reduce((s, p) => s + suggestReorder(p.quantity, p.min_stock) * Number(p.purchase_price), 0);
  const history = moves.filter((m) => m.type === "restock");

  return (
    <>
      <PageHeader title="Restock" subtitle="Suggested quantities bring stock to the threshold plus a small buffer. Nothing is ordered automatically.">
        <Button onClick={() => a.restock()}><PackagePlus />Record restock</Button>
      </PageHeader>
      {list.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nothing to restock" text="All products are above their low-stock threshold." />
      ) : (
        <>
          <div className="mb-3 text-sm text-muted-foreground">{list.length} products to order · estimated cost <b className="text-foreground tabular">{money(est)}</b></div>
          <div className="overflow-hidden rounded-lg border bg-card">
            <ul className="divide-y">
              {list.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-2 font-medium">{p.name}{p.is_sample && <SampleTag />}</div><div className="text-xs text-muted-foreground">{sup(p.supplier_id)} · last cost {money(p.purchase_price, { lbp: false })}</div></div>
                  <div className="text-right text-xs text-muted-foreground tabular">{p.quantity} on hand · min {p.min_stock}</div>
                  <StatusChip quantity={p.quantity} minStock={p.min_stock} />
                  <div className="rounded-md bg-accent px-2.5 py-1 text-sm font-semibold text-accent-foreground tabular">Order {suggestReorder(p.quantity, p.min_stock)}</div>
                  <Button size="sm" onClick={() => a.restock(p)}>Restock</Button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      <h2 className="mb-2 mt-8 font-semibold">Restock history</h2>
      {history.length === 0 ? <p className="text-sm text-muted-foreground">No restocks recorded yet.</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-3 py-2 text-left font-medium">Date</th><th className="px-3 py-2 text-left font-medium">Product</th><th className="px-3 py-2 text-right font-medium">Qty</th><th className="px-3 py-2 text-right font-medium">Unit cost</th><th className="px-3 py-2 text-left font-medium">Supplier</th></tr></thead>
            <tbody className="divide-y">{history.map((m) => (
              <tr key={m.id}><td className="px-3 py-2 text-muted-foreground">{new Date(m.occurred_at).toLocaleDateString()}</td><td className="px-3 py-2">{m.product_name}</td><td className="px-3 py-2 text-right text-success tabular">+{m.quantity_change}</td><td className="px-3 py-2 text-right tabular">{money(m.unit_cost, { lbp: false })}</td><td className="px-3 py-2 text-muted-foreground">{m.supplier_id ? sup(m.supplier_id) : "—"}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}