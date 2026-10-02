import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";

type AuthResponse = {
  success: boolean;
  message: string;
  access_token?: string;
  token_type?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: "super_admin" | "recruiter" | "candidate";
  };
};

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — RecruitFlow" },
      {
        name: "description",
        content:
          "Sign in or create a recruiter or candidate account on RecruitFlow.",
      },
      { property: "og:title", content: "Sign in — RecruitFlow" },
      {
        property: "og:description",
        content: "Sign in or create a recruiter or candidate account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { session, refreshUser } = useAuth();

  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<"candidate" | "recruiter">("candidate");

  useEffect(() => {
    if (session) {
      nav({ to: "/dashboard" });
    }
  }, [session, nav]);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");

    setBusy(true);

    try {
      const response = await api.post<AuthResponse>("/login", {
        email,
        password,
      });

      if (!response.access_token) {
        throw new Error(response.message || "Login failed.");
      }

      localStorage.setItem("access_token", response.access_token);
      await refreshUser();
      toast.success("Signed in successfully.");
      nav({ to: "/dashboard" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to sign in."
      );
    } finally {
      setBusy(false);
    }
  };

  const signUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const f = new FormData(form);

    const fullName = String(f.get("full_name") ?? "").trim();
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const company = String(f.get("company") ?? "").trim();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (
      role === "recruiter" &&
      !email.toLowerCase().endsWith("@recruitflow.com")
    ) {
      toast.error("Recruiter email must end with @recruitflow.com.");
      return;
    }

    setBusy(true);

    try {
      const response = await api.post<AuthResponse>("/register", {
        name: fullName,
        email,
        password,
        role,
        ...(role === "recruiter" && company ? { company } : {}),
      });

      if (!response.success) {
        throw new Error(response.message || "Registration failed.");
      }

      form.reset();
      setRole("candidate");

      if (role === "candidate") {
        try {
          const loginResponse = await api.post<AuthResponse>("/login", {
            email,
            password,
          });

          if (!loginResponse.access_token) {
            throw new Error(loginResponse.message || "Automatic sign-in failed.");
          }

          localStorage.setItem("access_token", loginResponse.access_token);
          await refreshUser();
          toast.success("Account created. Welcome to RecruitFlow!");
          nav({ to: "/dashboard" });
        } catch {
          toast.success("Account created successfully. Please sign in to continue.");
        }
      } else {
        toast.success(
          "Account created. Your recruiter account is pending admin approval."
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create account."
      );
    } finally {
      setBusy(false);
    }
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
                <div className="space-y-2">
                  <Label htmlFor="e1">Email</Label>
                  <Input id="e1" name="email" type="email" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="p1">Password</Label>
                  <Input id="p1" name="password" type="password" required />
                </div>

                <Button className="w-full" disabled={busy}>
                  {busy ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(["candidate", "recruiter"] as const).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRole(r)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize ${
                        role === r
                          ? "border-primary bg-accent text-accent-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      I'm a {r}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="n">Full name</Label>
                  <Input id="n" name="full_name" required maxLength={100} />
                </div>

                {role === "recruiter" && (
                  <div className="space-y-2">
                    <Label htmlFor="c">Company</Label>
                    <Input id="c" name="company" required maxLength={100} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="e2">Email</Label>
                  <Input id="e2" name="email" type="email" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="p2">Password</Label>
                  <Input
                    id="p2"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                  />
                </div>

                {role === "recruiter" && (
                  <p className="text-xs text-muted-foreground">
                    Recruiter accounts need admin approval before posting jobs.
                    Use your @recruitflow.com email.
                  </p>
                )}

                <Button className="w-full" disabled={busy}>
                  {busy ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
