import { createContext, useContext, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Package, Receipt, Truck, BarChart3, Settings, LogOut, Plus, ShoppingCart, PackagePlus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSettings, type Product } from "@/lib/data";
import { ProductDialog } from "./ProductDialog";
import { SaleDialog } from "./SaleDialog";
import { RestockDialog } from "./RestockDialog";

interface Actions {
  addProduct: () => void;
  editProduct: (p: Product) => void;
  recordSale: (productId?: string) => void;
  restock: (p?: Product) => void;
}
const Ctx = createContext<Actions | null>(null);
export function useActions() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useActions outside AppShell");
  return c;
}

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/sales", label: "Sales", icon: Receipt },
  { to: "/restock", label: "Restock", icon: Truck },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [prod, setProd] = useState<{ open: boolean; p: Product | null }>({ open: false, p: null });
  const [sale, setSale] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [rs, setRs] = useState<{ open: boolean; p: Product | null }>({ open: false, p: null });
  const { data: settings } = useSettings();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const actions: Actions = {
    addProduct: () => setProd({ open: true, p: null }),
    editProduct: (p) => setProd({ open: true, p }),
    recordSale: (id) => setSale({ open: true, id: id ?? null }),
    restock: (p) => setRs({ open: true, p: p ?? null }),
  };

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Ctx.Provider value={actions}>
      <div className="min-h-screen md:flex">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r bg-sidebar px-3 py-4 md:flex">
          <div className="mb-6 flex items-center gap-2 px-2">
            <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground"><Smartphone className="size-4" /></div>
            <div className="min-w-0"><div className="text-sm font-semibold leading-tight">MyPhone Manager</div><div className="truncate text-xs text-muted-foreground">{settings?.store_name}</div></div>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/60"
                activeProps={{ className: "bg-sidebar-accent font-medium text-sidebar-accent-foreground" }}>
                <n.icon className="size-4" />{n.label}
              </Link>
            ))}
          </nav>
          <Button variant="ghost" className="justify-start text-muted-foreground" onClick={signOut}><LogOut />Sign out</Button>
        </aside>

        <div className="min-w-0 flex-1 pb-24 md:pb-0">
          <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-4 py-2.5 backdrop-blur md:px-8">
            <div className="flex items-center gap-2 md:hidden">
              <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground"><Smartphone className="size-3.5" /></div>
              <span className="text-sm font-semibold">{settings?.store_name ?? "MyPhone"}</span>
            </div>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => actions.restock()} className="hidden sm:inline-flex"><PackagePlus />Restock</Button>
              <Button size="sm" variant="outline" onClick={actions.addProduct}><Plus /><span className="hidden sm:inline">Add product</span></Button>
              <Button size="sm" onClick={() => actions.recordSale()}><ShoppingCart />Record sale</Button>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
          {nav.filter((n) => n.to !== "/reports").map((n) => (
            <Link key={n.to} to={n.to} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground" activeProps={{ className: "text-primary font-medium" }}>
              <n.icon className="size-5" />{n.label}
            </Link>
          ))}
        </nav>
      </div>
      <ProductDialog open={prod.open} product={prod.p} onOpenChange={(o) => setProd((s) => ({ ...s, open: o }))} />
      <SaleDialog open={sale.open} initialProductId={sale.id} onOpenChange={(o) => setSale((s) => ({ ...s, open: o }))} />
      <RestockDialog open={rs.open} product={rs.p} onOpenChange={(o) => setRs((s) => ({ ...s, open: o }))} />
    </Ctx.Provider>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}</div>
      {children}
    </div>
  );
}