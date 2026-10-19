import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { stockStatus } from "@/lib/stock";

const styles = {
  out: "bg-danger-soft text-destructive",
  low: "bg-warning-soft text-warning",
  ok: "bg-success-soft text-success",
};
const labels = { out: "Out of stock", low: "Low stock", ok: "In stock" };

export function StatusChip({ quantity, minStock, className }: { quantity: number; minStock: number; className?: string }) {
  const s = stockStatus(quantity, minStock);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", styles[s], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {labels[s]}
    </span>
  );
}

export function SampleTag() {
  return <span className="rounded border border-warning/40 bg-warning-soft px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-warning">Sample</span>;
}

export function EmptyState({ icon: Icon, title, text, children }: { icon: ComponentType<{ className?: string }>; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-12 text-center">
      <div className="mb-3 grid size-11 place-items-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}