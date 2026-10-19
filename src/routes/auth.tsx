import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Smartphone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — MyPhone Manager" },
      { name: "description", content: "Owner sign-in for MyPhone Manager." },
      { property: "og:title", content: "Sign in — MyPhone Manager" },
      { property: "og:description", content: "Owner sign-in for MyPhone Manager." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast.error("Enter a valid email");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) return toast.error(error.message);
      navigate({ to: "/dashboard" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
      setBusy(false);
      if (error) return toast.error(error.message);
      if (data.session) navigate({ to: "/dashboard" }); else setSent(true);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) return toast.error(String(r.error.message ?? r.error));
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"><Smartphone className="size-5" /></div>
          <div><div className="font-semibold">MyPhone Manager</div><div className="text-xs text-muted-foreground">Private store manager</div></div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {sent ? (
            <div>
              <h1 className="text-lg font-semibold">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to <b>{email}</b>. Open it to activate your store, then sign in.</p>
              <Button variant="outline" className="mt-4 w-full" onClick={() => { setSent(false); setMode("in"); }}>Back to sign in</Button>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold">{mode === "in" ? "Sign in to your store" : "Create your owner account"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{mode === "in" ? "Welcome back." : "Your store data stays private to this account."}</p>
              <form onSubmit={submit} className="mt-5 space-y-3">
                <div><Label htmlFor="email" className="mb-1.5 block text-xs text-muted-foreground">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label htmlFor="pw" className="mb-1.5 block text-xs text-muted-foreground">Password</Label><Input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
              </form>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
              <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
              <button className="mt-4 w-full text-center text-sm text-primary hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
                {mode === "in" ? "First time? Create the owner account" : "Already have an account? Sign in"}
              </button>
            </>
          )}
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" />Records are visible only to the signed-in owner.</p>
      </div>
    </div>
  );
}