import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, Boxes, Wallet, AlertTriangle, Plus, ShoppingCart, PackagePlus, Activity, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, useActions } from "@/components/AppShell";
import { StatusChip, EmptyState, SampleTag } from "@/components/StatusChip";
import { supabase } from "@/integrations/supabase/client";
import { productsQ, movementsQ, salesQ, useMoney, useInvalidateAll } from "@/lib/data";
import { stockStatus, suggestReorder } from "@/lib/stock";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MyPhone Manager" }, { name: "description", content: "Store overview: stock, value and restocking needs." }] }),
  component: Dashboard,
});

export const movementLabel: Record<string, string> = { initial: "Opening stock", sale: "Sold", restock: "Restocked", return: "Returned", adjustment: "Adjusted" };

function Dashboard() {
  const { data: products = [], isLoading } = useQuery(productsQ);
  const { data: moves = [] } = useQuery(movementsQ);
  const { data: sales = [] } = useQuery(salesQ);
  const money = useMoney();
  const a = useActions();
  const invalidate = useInvalidateAll();

  const units = products.reduce((s, p) => s + p.quantity, 0);
  const costValue = products.reduce((s, p) => s + p.quantity * Number(p.purchase_price), 0);
  const needs = products.filter((p) => stockStatus(p.quantity, p.min_stock) !== "ok").sort((x, y) => x.quantity - y.quantity);
  const today = new Date().toDateString();
  const todaySales = sales.filter((s) => s.status === "completed" && new Date(s.sold_at).toDateString() === today);
  const todayTotal = todaySales.reduce((s, x) => s + Number(x.total), 0);

  async function loadSample() {
    const { error } = await supabase.rpc("load_sample_data");
    if (error) { toast.error(error.message); return; }
    toast.success("Sample products loaded — clearly marked [Sample]. Remove them anytime in Settings.");
    invalidate();
  }

  if (!isLoading && products.length === 0) {
    return (
      <>
        <PageHeader title="Welcome to MyPhone Manager" subtitle="Start by adding the products you have in the shop." />
        <EmptyState icon={Package} title="Your inventory is empty" text="Add your first phone or accessory. You can also try the app with clearly labeled sample products and remove them later.">
          <Button onClick={a.addProduct}><Plus />Add first product</Button>
          <Button variant="outline" onClick={loadSample}><Sparkles />Try with sample data</Button>
        </EmptyState>
      </>
    );
  }

  const kpis = [
    { label: "Products", value: products.length.toLocaleString(), icon: Package },
    { label: "Units in stock", value: units.toLocaleString(), icon: Boxes },
    { label: "Stock value (at cost)", value: money(costValue, { lbp: false }), icon: Wallet },
    { label: "Low / out of stock", value: needs.length.toString(), icon: AlertTriangle, warn: needs.length > 0 },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">{k.label}<k.icon className={k.warn ? "size-4 text-warning" : "size-4"} /></div>
            <div className="mt-2 text-2xl font-semibold tracking-tight tabular">{k.value}</div>
          </div>
        ))}
      </div>
      {todaySales.length > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-lg border bg-accent px-4 py-3 text-sm text-accent-foreground">
          <span>Today's sales: <b>{todaySales.length}</b></span><b className="tabular">{money(todayTotal)}</b>
        </div>
      )}
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <Button size="lg" className="h-14 flex-col gap-1 sm:flex-row sm:gap-2" onClick={() => a.recordSale()}><ShoppingCart />Record sale</Button>
        <Button size="lg" variant="outline" className="h-14 flex-col gap-1 sm:flex-row sm:gap-2" onClick={() => a.restock()}><PackagePlus />Restock</Button>
        <Button size="lg" variant="outline" className="h-14 flex-col gap-1 sm:flex-row sm:gap-2" onClick={a.addProduct}><Plus />Add product</Button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3"><h2 className="font-semibold">Needs restocking</h2><Link to="/restock" className="text-xs text-primary hover:underline">View all</Link></div>
          {needs.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Everything is above its low-stock threshold.</p> : (
            <ul className="divide-y">
              {needs.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{p.name}</div><div className="text-xs text-muted-foreground tabular">{p.quantity} left · min {p.min_stock} · order ~{suggestReorder(p.quantity, p.min_stock)}</div></div>
                  <StatusChip quantity={p.quantity} minStock={p.min_stock} />
                  <Button size="sm" variant="outline" onClick={() => a.restock(p)}>Restock</Button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3"><h2 className="font-semibold">Recent activity</h2><Link to="/reports" className="text-xs text-primary hover:underline">Stock movements</Link></div>
          {moves.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted-foreground"><Activity className="mx-auto mb-2 size-5" />No activity yet.</p> : (
            <ul className="divide-y">
              {moves.slice(0, 8).map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className={"w-12 shrink-0 text-right font-medium tabular " + (m.quantity_change < 0 ? "text-destructive" : "text-success")}>{m.quantity_change > 0 ? "+" : ""}{m.quantity_change}</span>
                  <div className="min-w-0 flex-1"><div className="truncate">{m.product_name}</div><div className="text-xs text-muted-foreground">{movementLabel[m.type]} · {new Date(m.occurred_at).toLocaleString()}</div></div>
                  {m.is_sample && <SampleTag />}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}