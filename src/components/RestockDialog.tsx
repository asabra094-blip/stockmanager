import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { productsQ, suppliersQ, errMsg, useInvalidateAll, type Product } from "@/lib/data";
import { suggestReorder } from "@/lib/stock";

const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function RestockDialog({ open, onOpenChange, product }: { open: boolean; onOpenChange: (o: boolean) => void; product: Product | null }) {
  const { data: products = [] } = useQuery(productsQ);
  const { data: sups = [] } = useQuery(suppliersQ);
  const invalidate = useInvalidateAll();
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [sup, setSup] = useState("");
  const [date, setDate] = useState("");
  const [updateCost, setUpdateCost] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const p = products.find((x) => x.id === pid) ?? null;

  function load(x: Product | null) {
    setPid(x?.id ?? "");
    setQty(x ? String(suggestReorder(x.quantity, x.min_stock)) : "");
    setCost(x ? String(x.purchase_price) : "");
    setSup(x?.supplier_id ?? "");
  }
  useEffect(() => { if (open) { load(product); setDate(new Date().toISOString().slice(0, 10)); setUpdateCost(true); setNote(""); } }, [open, product]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const n = parseInt(qty), c = Number(cost);
    if (!p) { toast.error("Choose a product"); return; }
    if (!(n > 0) || String(n) !== qty.trim()) { toast.error("Quantity must be a whole number above 0"); return; }
    if (cost === "" || !(c >= 0)) { toast.error("Enter a valid unit cost"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("restock_product", {
      p_product_id: p.id, p_quantity: n, p_unit_cost: c, ...(sup ? { p_supplier_id: sup } : {}),
      p_date: new Date(date + "T12:00:00").toISOString(), p_update_cost: updateCost, ...(note.trim() ? { p_note: note.trim() } : {}),
    });
    setBusy(false);
    if (error) { toast.error(errMsg(error.message)); return; }
    toast.success(`Added ${n} × ${p.name}`);
    invalidate(); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Restock</DialogTitle><DialogDescription>Record stock you received. Nothing is ordered automatically.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="mb-1.5 block text-xs text-muted-foreground">Product</Label>
            <select className={sel} value={pid} onChange={(e) => load(products.find((x) => x.id === e.target.value) ?? null)} autoFocus={!product}>
              <option value="">— Choose —</option>
              {products.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.quantity} on hand)</option>)}
            </select>
            {p && <p className="mt-1 text-xs text-muted-foreground">On hand {p.quantity} · threshold {p.min_stock} · suggested {suggestReorder(p.quantity, p.min_stock)}</p>}
          </div>
          <div><Label className="mb-1.5 block text-xs text-muted-foreground">Quantity received</Label><Input autoFocus={!!product} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div><Label className="mb-1.5 block text-xs text-muted-foreground">Unit cost (USD)</Label><Input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
          <div><Label className="mb-1.5 block text-xs text-muted-foreground">Supplier</Label>
            <select className={sel} value={sup} onChange={(e) => setSup(e.target.value)}>
              <option value="">— None —</option>{sups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div><Label className="mb-1.5 block text-xs text-muted-foreground">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="col-span-2"><Label className="mb-1.5 block text-xs text-muted-foreground">Note</Label><Input maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <label className="col-span-2 flex items-center gap-2 text-sm"><Checkbox checked={updateCost} onCheckedChange={(v) => setUpdateCost(!!v)} />Use this as the product's new purchase cost</label>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Add to stock"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}