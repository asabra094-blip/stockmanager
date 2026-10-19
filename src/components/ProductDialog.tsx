import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQ, suppliersQ, errMsg, useInvalidateAll, useSettings, type Product } from "@/lib/data";
import { marginPct } from "@/lib/stock";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  brand: z.string().trim().max(60),
  model: z.string().trim().max(60),
  category_id: z.string(),
  sku: z.string().trim().max(60),
  barcode: z.string().trim().max(60),
  imei: z.string().trim().max(200),
  purchase_price: z.coerce.number({ invalid_type_error: "Enter a number" }).min(0, "Cannot be negative"),
  sale_price: z.coerce.number({ invalid_type_error: "Enter a number" }).min(0, "Cannot be negative"),
  quantity: z.coerce.number().int("Whole numbers only").min(0, "Cannot be negative"),
  min_stock: z.coerce.number().int("Whole numbers only").min(0, "Cannot be negative"),
  supplier_id: z.string(),
  location: z.string().trim().max(60),
  notes: z.string().trim().max(1000),
  image_url: z.union([z.literal(""), z.string().trim().url("Must be a valid link")]),
});
type Form = Record<keyof z.infer<typeof schema>, string>;

function toForm(p: Product | null | undefined, minDefault: number): Form {
  return {
    name: p?.name ?? "", brand: p?.brand ?? "", model: p?.model ?? "", category_id: p?.category_id ?? "",
    sku: p?.sku ?? "", barcode: p?.barcode ?? "", imei: p?.imei ?? "",
    purchase_price: p ? String(p.purchase_price) : "", sale_price: p ? String(p.sale_price) : "",
    quantity: p ? String(p.quantity) : "0", min_stock: String(p?.min_stock ?? minDefault),
    supplier_id: p?.supplier_id ?? "", location: p?.location ?? "", notes: p?.notes ?? "", image_url: p?.image_url ?? "",
  };
}

const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function ProductDialog({ open, onOpenChange, product }: { open: boolean; onOpenChange: (o: boolean) => void; product: Product | null }) {
  const { data: settings } = useSettings();
  const { data: cats = [] } = useQuery(categoriesQ);
  const { data: sups = [] } = useQuery(suppliersQ);
  const invalidate = useInvalidateAll();
  const [f, setF] = useState<Form>(() => toForm(product, 3));
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setF(toForm(product, settings?.min_stock_default ?? 3)); setErrors({}); }
  }, [open, product, settings?.min_stock_default]);

  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const cost = Number(f.purchase_price) || 0, price = Number(f.sale_price) || 0;
  const m = marginPct(cost, price);

  async function save(e: FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(f);
    if (!r.success) {
      const errs: typeof errors = {};
      r.error.issues.forEach((i) => { errs[i.path[0] as keyof Form] = i.message; });
      setErrors(errs); return;
    }
    const v = r.data;
    const n = (s: string) => (s === "" ? null : s);
    const row = {
      name: v.name, brand: n(v.brand), model: n(v.model), category_id: n(v.category_id), sku: n(v.sku), barcode: n(v.barcode),
      imei: n(v.imei), purchase_price: v.purchase_price, sale_price: v.sale_price, quantity: v.quantity, min_stock: v.min_stock,
      supplier_id: n(v.supplier_id), location: n(v.location), notes: n(v.notes), image_url: n(v.image_url),
    };
    setBusy(true);
    const res = product ? await supabase.from("products").update(row).eq("id", product.id) : await supabase.from("products").insert(row);
    setBusy(false);
    if (res.error) {
      if (res.error.message.includes("products_owner_sku_uniq")) setErrors({ sku: "This SKU is already used by another product" });
      else toast.error(errMsg(res.error.message));
      return;
    }
    toast.success(product ? "Product updated" : "Product added");
    invalidate(); onOpenChange(false);
  }

  const F = ({ k, label, children, className }: { k: keyof Form; label: string; children?: ReactNode; className?: string }) => (
    <div className={className}>
      <Label htmlFor={`pf-${k}`} className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children ?? <Input id={`pf-${k}`} value={f[k]} onChange={set(k)} aria-invalid={!!errors[k]} />}
      {errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>Only the name is required. Prices are in USD.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-4">
            <Label htmlFor="pf-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">Name *</Label>
            <Input id="pf-name" autoFocus value={f.name} onChange={set("name")} aria-invalid={!!errors.name} placeholder="e.g. Galaxy A15 128GB Black" />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>
          {F({ k: "brand", label: "Brand" })}
          {F({ k: "model", label: "Model" })}
          {F({ k: "category_id", label: "Category", className: "col-span-2", children: (
            <select id="pf-category_id" className={sel} value={f.category_id} onChange={set("category_id")}>
              <option value="">— None —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>) })}
          {F({ k: "purchase_price", label: "Purchase cost (USD)" , children: <Input id="pf-purchase_price" inputMode="decimal" value={f.purchase_price} onChange={set("purchase_price")} placeholder="0.00" /> })}
          {F({ k: "sale_price", label: "Sale price (USD)", children: <Input id="pf-sale_price" inputMode="decimal" value={f.sale_price} onChange={set("sale_price")} placeholder="0.00" /> })}
          {F({ k: "quantity", label: product ? "Quantity on hand" : "Opening quantity", children: <Input id="pf-quantity" inputMode="numeric" value={f.quantity} onChange={set("quantity")} /> })}
          {F({ k: "min_stock", label: "Low-stock threshold", children: <Input id="pf-min_stock" inputMode="numeric" value={f.min_stock} onChange={set("min_stock")} /> })}
          <div className="col-span-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground sm:col-span-4">
            Expected profit per unit: <b className="text-foreground tabular">${(price - cost).toFixed(2)}</b>
            {m !== null && <> · margin <b className="text-foreground tabular">{m.toFixed(1)}%</b></>}
            <span className="ml-1">(estimate — real profit is counted only when you record a sale)</span>
          </div>
          {F({ k: "sku", label: "SKU (unique)" })}
          {F({ k: "barcode", label: "Barcode" })}
          {F({ k: "supplier_id", label: "Supplier", className: "col-span-2", children: (
            <select id="pf-supplier_id" className={sel} value={f.supplier_id} onChange={set("supplier_id")}>
              <option value="">— None —</option>
              {sups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>) })}
          {F({ k: "location", label: "Location / bin" })}
          {F({ k: "image_url", label: "Image link", className: "col-span-1 sm:col-span-3" })}
          {F({ k: "imei", label: "IMEI / serial numbers (reference only, does not change quantity)", className: "col-span-2 sm:col-span-4" })}
          {F({ k: "notes", label: "Notes", className: "col-span-2 sm:col-span-4", children: <Textarea id="pf-notes" rows={2} value={f.notes} onChange={set("notes")} /> })}
          <DialogFooter className="col-span-2 mt-1 sm:col-span-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : product ? "Save changes" : "Add product"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}