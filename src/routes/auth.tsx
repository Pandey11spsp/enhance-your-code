import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — RecruitFlow" },
      { name: "description", content: "Sign in or create a recruiter or candidate account on RecruitFlow." },
      { property: "og:title", content: "Sign in — RecruitFlow" },
      { property: "og:description", content: "Sign in or create a recruiter or candidate account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<"candidate" | "recruiter">("candidate");

  useEffect(() => {
    if (session) nav({ to: "/dashboard" });
  }, [session, nav]);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  const signUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(f.get("email")),
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: String(f.get("full_name")), role, company: String(f.get("company") ?? "") },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (!data.session) toast.success("Check your email to confirm your account.");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <Logo className="mb-8 justify-center" />
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="mt-4 space-y-4">
                <div className="space-y-2"><Label htmlFor="e1">Email</Label><Input id="e1" name="email" type="email" required /></div>
                <div className="space-y-2"><Label htmlFor="p1">Password</Label><Input id="p1" name="password" type="password" required /></div>
                <Button className="w-full" disabled={busy}>Sign in</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(["candidate", "recruiter"] as const).map((r) => (
                    <button type="button" key={r} onClick={() => setRole(r)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize ${role === r ? "border-primary bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
                      I'm a {r}
                    </button>
                  ))}
                </div>
                <div className="space-y-2"><Label htmlFor="n">Full name</Label><Input id="n" name="full_name" required maxLength={100} /></div>
                {role === "recruiter" && (
                  <div className="space-y-2"><Label htmlFor="c">Company</Label><Input id="c" name="company" required maxLength={100} /></div>
                )}
                <div className="space-y-2"><Label htmlFor="e2">Email</Label><Input id="e2" name="email" type="email" required /></div>
                <div className="space-y-2"><Label htmlFor="p2">Password</Label><Input id="p2" name="password" type="password" required /></div>
                {role === "recruiter" && <p className="text-xs text-muted-foreground">Recruiter accounts need admin approval before posting jobs.</p>}
                <Button className="w-full" disabled={busy}>Create account</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
