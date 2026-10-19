import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MyPhone Manager — Store inventory & sales" },
      { name: "description", content: "Private inventory, sales and restocking manager for a mobile phone and accessories shop." },
      { property: "og:title", content: "MyPhone Manager" },
      { property: "og:description", content: "Private inventory, sales and restocking manager for a phone shop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/dashboard" : "/auth" });
  },
});