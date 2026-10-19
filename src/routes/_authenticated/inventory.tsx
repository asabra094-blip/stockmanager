import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, ShoppingCart, PackagePlus, ArrowUpDown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader, useActions } from "@/components/AppShell";
import { StatusChip, EmptyState, SampleTag } from "@/components/StatusChip";
import { supabase } from "@/integrations/supabase/client";
import { productsQ, categoriesQ, useMoney, useInvalidateAll, type Product } from "@/lib/data";
import { stockStatus, marginPct } from "@/lib/stock";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventory — MyPhone Manager" }, { name: "description", content: "Search, filter and manage products." }] }),
  component: Inventory,
});

type SortKey = "name" | "quantity" | "purchase_price" | "sale_price" | "category";
const sel = "h-9 rounded-md border border-input bg-background px-3 text-sm";

function Inventory() {
  const { data: products = [], isLoading } = useQuery(productsQ);
  const { data: cats = [] } = useQuery(categoriesQ);
  const money = useMoney();
  const a = useActions();
  const invalidate = useInvalidateAll();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "name", dir: 1 });
  const [del, setDel] = useState<Product | null>(null);
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? "—";

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products
      .filter((p) => !t || [p.name, p.brand, p.model, p.sku, p.barcode, p.imei].some((v) => v?.toLowerCase().includes(t)))
      .filter((p) => !cat || p.category_id === cat)
      .filter((p) => !status || stockStatus(p.quantity, p.min_stock) === status)
      .sort((x, y) => {
        const v = (p: Product) => (sort.k === "category" ? catName(p.category_id) : sort.k === "name" ? p.name.toLowerCase() : Number(p[sort.k]));
        const a1 = v(x), b1 = v(y);
        return (a1 < b1 ? -1 : a1 > b1 ? 1 : 0) * sort.dir;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, q, cat, status, sort, cats]);

  async function remove() {
    if (!del) return;
    const { error } = await supabase.from("products").delete().eq("id", del.id);
    if (error) toast.error(error.message); else { toast.success("Product deleted. Past sales keep their records."); invalidate(); }
    setDel(null);
  }

  const Th = ({ k, children, right }: { k: SortKey; children: string; right?: boolean }) => (
    <th className={"px-3 py-2 font-medium " + (right ? "text-right" : "text-left")}>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {children}<ArrowUpDown className={"size-3 " + (sort.k === k ? "text-primary" : "opacity-40")} />
      </button>
    </th>
  );

  return (
    <>
      <PageHeader title="Inventory" subtitle={`${products.length} products`}>
        <Button onClick={a.addProduct}><Plus />Add product</Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, brand, SKU, barcode, IMEI…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={sel} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Stock status">
          <option value="">Any status</option><option value="ok">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option>
        </select>
      </div>

      {!isLoading && products.length === 0 ? (
        <EmptyState icon={Package} title="No products yet" text="Add products to start tracking stock."><Button onClick={a.addProduct}><Plus />Add product</Button></EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState icon={Search} title="No matches" text="Try a different search or clear the filters."><Button variant="outline" onClick={() => { setQ(""); setCat(""); setStatus(""); }}>Clear filters</Button></EmptyState>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                <tr><Th k="name">Product</Th><Th k="category">Category</Th><th className="px-3 py-2 text-left font-medium">SKU</th><Th k="quantity" right>Qty</Th><th className="px-3 py-2 text-right font-medium">Min</th><Th k="purchase_price" right>Cost</Th><Th k="sale_price" right>Price</Th><th className="px-3 py-2 text-left font-medium">Status</th><th /></tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((p) => {
                  const m = marginPct(Number(p.purchase_price), Number(p.sale_price));
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2.5"><div className="flex items-center gap-2 font-medium">{p.name}{p.is_sample && <SampleTag />}</div><div className="text-xs text-muted-foreground">{[p.brand, p.model, p.location].filter(Boolean).join(" · ")}</div></td>
                      <td className="px-3 py-2.5 text-muted-foreground">{catName(p.category_id)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{p.sku ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular">{p.quantity}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground tabular">{p.min_stock}</td>
                      <td className="px-3 py-2.5 text-right tabular">{money(p.purchase_price, { lbp: false })}</td>
                      <td className="px-3 py-2.5 text-right tabular">{money(p.sale_price, { lbp: false })}{m !== null && <div className="text-xs text-muted-foreground">+{money(Number(p.sale_price) - Number(p.purchase_price), { lbp: false })} · {m.toFixed(0)}%</div>}</td>
                      <td className="px-3 py-2.5"><StatusChip quantity={p.quantity} minStock={p.min_stock} /></td>
                      <td className="px-2 py-2.5"><RowActions p={p} onDelete={() => setDel(p)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 md:hidden">
            {rows.map((p) => (
              <div key={p.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="flex items-center gap-2 font-medium">{p.name}{p.is_sample && <SampleTag />}</div><div className="text-xs text-muted-foreground">{catName(p.category_id)}{p.sku && ` · ${p.sku}`}</div></div>
                  <StatusChip quantity={p.quantity} minStock={p.min_stock} />
                </div>
                <div className="mt-2 grid grid-cols-3 text-xs"><div><div className="text-muted-foreground">Qty / min</div><b className="text-sm tabular">{p.quantity}</b> / {p.min_stock}</div><div><div className="text-muted-foreground">Cost</div><span className="tabular">{money(p.purchase_price, { lbp: false })}</span></div><div><div className="text-muted-foreground">Price</div><span className="tabular">{money(p.sale_price, { lbp: false })}</span></div></div>
                <div className="mt-2 flex justify-end border-t pt-2"><RowActions p={p} onDelete={() => setDel(p)} /></div>
              </div>
            ))}
          </div>
        </>
      )}
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete "{del?.name}"?</AlertDialogTitle><AlertDialogDescription>The product is removed from inventory. Past sales and stock history are kept.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RowActions({ p, onDelete }: { p: Product; onDelete: () => void }) {
  const a = useActions();
  return (
    <div className="flex justify-end gap-0.5">
      <Button variant="ghost" size="icon" className="size-8" title="Sell" aria-label={`Sell ${p.name}`} disabled={p.quantity <= 0} onClick={() => a.recordSale(p.id)}><ShoppingCart /></Button>
      <Button variant="ghost" size="icon" className="size-8" title="Restock" aria-label={`Restock ${p.name}`} onClick={() => a.restock(p)}><PackagePlus /></Button>
      <Button variant="ghost" size="icon" className="size-8" title="Edit" aria-label={`Edit ${p.name}`} onClick={() => a.editProduct(p)}><Pencil /></Button>
      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title="Delete" aria-label={`Delete ${p.name}`} onClick={onDelete}><Trash2 /></Button>
    </div>
  );
}