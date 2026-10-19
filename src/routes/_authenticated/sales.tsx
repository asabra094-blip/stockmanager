import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Receipt, ShoppingCart, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader, useActions } from "@/components/AppShell";
import { EmptyState, SampleTag } from "@/components/StatusChip";
import { supabase } from "@/integrations/supabase/client";
import { salesQ, useMoney, useInvalidateAll, type Sale } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Sales — MyPhone Manager" }, { name: "description", content: "Sales history and returns." }] }),
  component: Sales,
});

function Sales() {
  const { data: sales = [], isLoading } = useQuery(salesQ);
  const money = useMoney();
  const a = useActions();
  const invalidate = useInvalidateAll();
  const [ret, setRet] = useState<Sale | null>(null);
  const [note, setNote] = useState("");

  async function doReturn() {
    if (!ret) return;
    const { error } = await supabase.rpc("return_sale", { p_sale_id: ret.id, ...(note.trim() ? { p_note: note.trim() } : {}) });
    if (error) toast.error(error.message); else { toast.success("Sale returned and stock restored"); invalidate(); }
    setRet(null); setNote("");
  }

  return (
    <>
      <PageHeader title="Sales" subtitle="Every sale is kept. Returns restore stock and are marked, never deleted.">
        <Button onClick={() => a.recordSale()}><ShoppingCart />Record sale</Button>
      </PageHeader>
      {!isLoading && sales.length === 0 ? (
        <EmptyState icon={Receipt} title="No sales recorded yet" text="When you sell something, record it here so stock and profit stay accurate."><Button onClick={() => a.recordSale()}><ShoppingCart />Record first sale</Button></EmptyState>
      ) : (
        <div className="space-y-2">
          {sales.map((s) => {
            const profit = Number(s.total) - Number(s.total_cost);
            const returned = s.status === "returned";
            return (
              <div key={s.id} className={"rounded-lg border bg-card p-3 sm:p-4 " + (returned ? "opacity-70" : "")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">{new Date(s.sold_at).toLocaleString()}{s.is_sample && <SampleTag />}
                      {returned && <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs text-destructive">Returned</span>}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{s.sale_lines.map((l) => `${l.quantity} × ${l.product_name} @ ${money(l.unit_price, { lbp: false })}`).join(", ")}</div>
                    {s.note && <div className="mt-1 text-xs text-muted-foreground">Note: {s.note}</div>}
                  </div>
                  <div className="text-right">
                    <div className={"font-semibold tabular " + (returned ? "line-through" : "")}>{money(s.total)}</div>
                    {Number(s.discount) > 0 && <div className="text-xs text-muted-foreground">discount {money(s.discount, { lbp: false })}</div>}
                    {!returned && <div className="text-xs text-success tabular">profit {money(profit, { lbp: false })}</div>}
                    {!returned && <Button size="sm" variant="ghost" className="mt-1 h-7 text-muted-foreground" onClick={() => setRet(s)}><Undo2 />Return</Button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <AlertDialog open={!!ret} onOpenChange={(o) => !o && setRet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Return this sale?</AlertDialogTitle><AlertDialogDescription>All items go back into stock. The sale stays in history marked as returned and no longer counts in revenue.</AlertDialogDescription></AlertDialogHeader>
          <Input placeholder="Reason (optional)" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={doReturn}>Return sale</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}