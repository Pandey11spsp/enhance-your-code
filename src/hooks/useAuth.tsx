import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "super_admin" | "recruiter" | "candidate";
export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  approval: "pending" | "approved" | "rejected";
};

type Ctx = {
  session: Session | null;
  role: Role | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({ session: null, role: null, profile: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    const load = async (s: Session | null) => {
      setSession(s);
      if (!s) {
        setRole(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      const [{ data: roles }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", s.user.id),
        supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
      ]);
      const list = (roles ?? []).map((r) => r.role as Role);
      setRole(list.includes("super_admin") ? "super_admin" : list.includes("recruiter") ? "recruiter" : list[0] ?? "candidate");
      setProfile(prof as Profile | null);
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setTimeout(() => load(s), 0);
        if (event !== "SIGNED_OUT") qc.invalidateQueries();
        else qc.clear();
      }
    });
    supabase.auth.getSession().then(({ data }) => load(data.session));
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  return (
    <AuthCtx.Provider value={{ session, role, profile, loading, signOut: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
