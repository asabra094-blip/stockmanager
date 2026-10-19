import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, Search, Trash2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { productsQ, errMsg, useInvalidateAll, useMoney, type Product } from "@/lib/data";
import { saleTotals } from "@/lib/stock";

interface Line { product: Product; quantity: number; price: string }

function localNow() {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function SaleDialog({ open, onOpenChange, initialProductId }: { open: boolean; onOpenChange: (o: boolean) => void; initialProductId?: string | null }) {
  const { data: products = [] } = useQuery(productsQ);
  const money = useMoney();
  const invalidate = useInvalidateAll();
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [note, setNote] = useState("");
  const [when, setWhen] = useState(localNow());
  const [step, setStep] = useState<"edit" | "confirm" | "done">("edit");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQ(""); setDiscount(""); setNote(""); setWhen(localNow()); setStep("edit");
    const p = initialProductId ? products.find((x) => x.id === initialProductId) : null;
    setLines(p && p.quantity > 0 ? [{ product: p, quantity: 1, price: String(p.sale_price) }] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialProductId]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return products.filter((p) => [p.name, p.brand, p.sku, p.barcode, p.imei, p.model].some((v) => v?.toLowerCase().includes(t))).slice(0, 6);
  }, [q, products]);

  function add(p: Product) {
    setLines((ls) => {
      const ex = ls.find((l) => l.product.id === p.id);
      if (ex) return ls.map((l) => (l === ex ? { ...l, quantity: Math.min(p.quantity, l.quantity + 1) } : l));
      return [...ls, { product: p, quantity: 1, price: String(p.sale_price) }];
    });
    setQ("");
  }
  const upd = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const disc = Number(discount) || 0;
  const totals = saleTotals(lines.map((l) => ({ quantity: l.quantity, unit_price: Number(l.price) || 0, unit_cost: Number(l.product.purchase_price) })), disc);
  const problems = [
    ...lines.filter((l) => l.quantity > l.product.quantity).map((l) => `Only ${l.product.quantity} of "${l.product.name}" in stock`),
    ...lines.filter((l) => !(Number(l.price) >= 0) || l.price === "").map((l) => `Enter a price for "${l.product.name}"`),
    ...(disc < 0 ? ["Discount cannot be negative"] : []),
    ...(disc > totals.subtotal ? ["Discount is larger than the sale"] : []),
  ];

  async function submit() {
    setBusy(true);
    const { error } = await supabase.rpc("record_sale", {
      p_lines: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity, unit_price: Number(l.price) })),
      p_discount: disc, p_note: note || undefined, p_sold_at: new Date(when).toISOString(),
    });
    setBusy(false);
    if (error) { toast.error(errMsg(error.message)); setStep("edit"); invalidate(); return; }
    invalidate(); setStep("done");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        {step === "done" ? (
          <div className="py-2">
            <div className="flex items-center gap-2 text-success"><CheckCircle2 className="size-5" /><DialogTitle>Sale recorded</DialogTitle></div>
            <Receipt lines={lines} totals={totals} discount={disc} note={note} when={when} money={money} />
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => { setLines([]); setDiscount(""); setNote(""); setWhen(localNow()); setStep("edit"); }}>New sale</Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : step === "confirm" ? (
          <div>
            <DialogHeader><DialogTitle>Confirm sale</DialogTitle><DialogDescription>Stock will be deducted right away.</DialogDescription></DialogHeader>
            <Receipt lines={lines} totals={totals} discount={disc} note={note} when={when} money={money} />
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setStep("edit")}>Back</Button>
              <Button autoFocus onClick={submit} disabled={busy}>{busy ? "Recording…" : `Confirm ${money(totals.total, { lbp: false })}`}</Button>
            </DialogFooter>
          </div>
        ) : (
          <div>
            <DialogHeader><DialogTitle>Record sale</DialogTitle><DialogDescription>Search by name, SKU, barcode or IMEI. Press Enter to add the first match.</DialogDescription></DialogHeader>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus className="pl-9" placeholder="Find product…" value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && results[0] && results[0].quantity > 0) { e.preventDefault(); add(results[0]); } }} />
              {results.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                  {results.map((p) => (
                    <button key={p.id} type="button" disabled={p.quantity <= 0} onClick={() => add(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50">
                      <span className="truncate">{p.name}<span className="ml-2 text-xs text-muted-foreground">{p.sku}</span></span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular">{p.quantity > 0 ? `${p.quantity} left · ${money(p.sale_price, { lbp: false })}` : "Out of stock"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {lines.length === 0 && <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">No products added yet.</p>}
              {lines.map((l, i) => (
                <div key={l.product.id} className="rounded-md border p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="truncate text-sm font-medium">{l.product.name}</div><div className="text-xs text-muted-foreground">{l.product.quantity} in stock</div></div>
                    <Button variant="ghost" size="icon" className="size-7" aria-label="Remove" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><Trash2 /></Button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center rounded-md border">
                      <Button variant="ghost" size="icon" className="size-8" aria-label="Less" onClick={() => upd(i, { quantity: Math.max(1, l.quantity - 1) })}><Minus /></Button>
                      <Input className="h-8 w-12 border-0 text-center shadow-none tabular" inputMode="numeric" value={l.quantity}
                        onChange={(e) => upd(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} />
                      <Button variant="ghost" size="icon" className="size-8" aria-label="More" onClick={() => upd(i, { quantity: l.quantity + 1 })}><Plus /></Button>
                    </div>
                    <span className="text-xs text-muted-foreground">× $</span>
                    <Input className="h-8 w-24 tabular" inputMode="decimal" value={l.price} onChange={(e) => upd(i, { price: e.target.value })} aria-label="Unit price" />
                    <span className="ml-auto text-sm font-medium tabular">{money(l.quantity * (Number(l.price) || 0), { lbp: false })}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block text-xs text-muted-foreground">Discount (USD)</Label><Input inputMode="decimal" placeholder="0.00" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
              <div><Label className="mb-1.5 block text-xs text-muted-foreground">Date & time</Label><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
              <div className="col-span-2"><Label className="mb-1.5 block text-xs text-muted-foreground">Note (optional)</Label><Input maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Customer name, phone, warranty…" /></div>
            </div>
            {problems.length > 0 && lines.length > 0 && <div className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-xs text-destructive">{problems.map((p) => <div key={p}>{p}</div>)}</div>}
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <div><div className="text-xs text-muted-foreground">Total</div><div className="text-lg font-semibold tabular">{money(totals.total)}</div></div>
              <Button size="lg" disabled={lines.length === 0 || problems.length > 0} onClick={() => setStep("confirm")}>Review sale</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Receipt({ lines, totals, discount, note, when, money }: { lines: Line[]; totals: ReturnType<typeof saleTotals>; discount: number; note: string; when: string; money: ReturnType<typeof useMoney> }) {
  return (
    <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
      <div className="mb-2 text-xs text-muted-foreground">{new Date(when).toLocaleString()}</div>
      {lines.map((l) => (
        <div key={l.product.id} className="flex justify-between py-0.5"><span className="truncate pr-2">{l.quantity} × {l.product.name}</span><span className="tabular">{money(l.quantity * Number(l.price), { lbp: false })}</span></div>
      ))}
      <div className="mt-2 space-y-0.5 border-t pt-2">
        {discount > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span className="tabular">−{money(discount, { lbp: false })}</span></div>}
        <div className="flex justify-between font-semibold"><span>Total</span><span className="tabular">{money(totals.total)}</span></div>
        <div className="flex justify-between text-xs text-muted-foreground"><span>Gross profit on this sale</span><span className="tabular">{money(totals.profit, { lbp: false })}</span></div>
      </div>
      {note && <div className="mt-2 text-xs text-muted-foreground">Note: {note}</div>}
    </div>
  );
}