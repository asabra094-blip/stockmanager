import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
export type Sale = Database["public"]["Tables"]["sales"]["Row"];
export type SaleLine = Database["public"]["Tables"]["sale_lines"]["Row"];
export type Movement = Database["public"]["Tables"]["inventory_movements"]["Row"];
export type Settings = Database["public"]["Tables"]["store_settings"]["Row"];

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export const productsQ = queryOptions({
  queryKey: ["products"],
  queryFn: async () =>
    check(await supabase.from("products").select("*").eq("archived", false).order("name")) as Product[],
});
export const categoriesQ = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => check(await supabase.from("categories").select("*").order("sort_order").order("name")) as Category[],
});
export const suppliersQ = queryOptions({
  queryKey: ["suppliers"],
  queryFn: async () => check(await supabase.from("suppliers").select("*").order("name")) as Supplier[],
});
export const salesQ = queryOptions({
  queryKey: ["sales"],
  queryFn: async () =>
    check(
      await supabase.from("sales").select("*, sale_lines(*)").order("sold_at", { ascending: false }).limit(500),
    ) as (Sale & { sale_lines: SaleLine[] })[],
});
export const movementsQ = queryOptions({
  queryKey: ["movements"],
  queryFn: async () =>
    check(
      await supabase.from("inventory_movements").select("*").order("occurred_at", { ascending: false }).limit(300),
    ) as Movement[],
});
export const settingsQ = queryOptions({
  queryKey: ["settings"],
  queryFn: async (): Promise<Settings> => {
    let r = await supabase.from("store_settings").select("*").maybeSingle();
    if (!r.data && !r.error) {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) await supabase.rpc("handle_new_user_cats", { p_uid: u.user.id });
      r = await supabase.from("store_settings").select("*").maybeSingle();
    }
    return check(r) as Settings;
  },
});

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function useSettings() {
  return useQuery(settingsQ);
}

export function useMoney() {
  const { data } = useSettings();
  return (usd: number | null | undefined, opts?: { lbp?: boolean }) => {
    const v = Number(usd ?? 0);
    const s = `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (opts?.lbp !== false && data?.show_lbp) {
      const l = Math.round(v * Number(data.lbp_rate));
      return `${s} · ${l.toLocaleString("en-US")} LBP`;
    }
    return s;
  };
}

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}