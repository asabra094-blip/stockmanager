import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useSettings, useInvalidateAll, categoriesQ, suppliersQ } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — MyPhone Manager" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { data: categories = [] } = useQuery(categoriesQ);
  const { data: suppliers = [] } = useQuery(suppliersQ);
  const invalidate = useInvalidateAll();

  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState("3");
  const [lbp, setLbp] = useState(false);
  const [rate, setRate] = useState("89500");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setName(settings.store_name);
    setThreshold(String(settings.min_stock_default));
    setLbp(settings.show_lbp);
    setRate(String(settings.lbp_rate));
  }, [settings]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    const n = Number(threshold);
    const r = Number(rate);
    if (!name.trim()) { toast.error("Enter your store name"); return; }
    if (!Number.isInteger(n) || n < 0) { toast.error("Minimum stock must be a whole number of 0 or more"); return; }
    if (!Number.isFinite(r) || r <= 0) { toast.error("Enter a valid LBP exchange rate"); return; }
    setSaving(true);
    const { error } = await supabase.from("store_settings").update({
      store_name: name.trim(),
      min_stock_default: n,
      show_lbp: lbp,
      lbp_rate: r,
    }).eq("owner_id", settings.owner_id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Settings saved");
    invalidate();
  }

  async function clearSamples() {
    if (!window.confirm("Remove the optional sample records? Your real products and sales will remain.")) return;
    setClearing(true);
    const { error } = await supabase.rpc("clear_sample_data");
    setClearing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Sample data removed");
    invalidate();
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Keep your store details and display preferences simple." />
      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={save} className="space-y-4 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Store preferences</h2>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading settings…</p> : (
            <>
              <div>
                <Label htmlFor="store-name" className="mb-1.5 block text-sm">Store name</Label>
                <Input id="store-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="threshold" className="mb-1.5 block text-sm">Default low-stock threshold</Label>
                <Input id="threshold" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                <p className="mt-1 text-xs text-muted-foreground">Used as the default when creating new products. Existing product thresholds stay unchanged.</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={lbp} onCheckedChange={(value) => setLbp(value === true)} />
                Show Lebanese pounds alongside USD
              </label>
              {lbp && (
                <div>
                  <Label htmlFor="rate" className="mb-1.5 block text-sm">LBP per 1 USD</Label>
                  <Input id="rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
                  <p className="mt-1 text-xs text-muted-foreground">Manual reference rate only. It does not update automatically.</p>
                </div>
              )}
              <Button type="submit" disabled={saving || !settings}><Save />{saving ? "Saving…" : "Save settings"}</Button>
            </>
          )}
        </form>
        <div className="space-y-5">
          <section className="rounded-lg border bg-card p-5">
            <h2 className="font-semibold">Store catalog</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {categories.length} categories · {suppliers.length} suppliers. You can choose these when editing products.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Supplier and category editing will be added after the main-branch pilot is tested.</p>
          </section>
          <section className="rounded-lg border bg-card p-5">
            <h2 className="font-semibold">Sample data</h2>
            <p className="mt-2 text-sm text-muted-foreground">If you tried the optional demo inventory, you can remove its sample products and transactions before entering real stock.</p>
            <Button type="button" variant="outline" className="mt-4" onClick={clearSamples} disabled={clearing}>
              <Trash2 />{clearing ? "Removing…" : "Clear sample data"}
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}
