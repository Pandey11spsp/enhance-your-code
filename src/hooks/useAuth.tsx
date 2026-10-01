import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/api";

export type Role = "super_admin" | "recruiter" | "candidate";

export type User = {
  id: number;
  email: string;
  name: string;
  role: Role;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  approval: "pending" | "approved" | "rejected";
};

type AuthResponse = {
  success: boolean;
  user: User;
};

type Ctx = {
  user: User | null;
  session: { user: User } | null;
  role: Role | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null,
  session: null,
  role: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get<AuthResponse>("/me");

      setUser(response.user);
    } catch {
      localStorage.removeItem("access_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const signOut = async () => {
    localStorage.removeItem("access_token");
    setUser(null);
  };

  const role = user?.role ?? null;

  const profile: Profile | null = user
    ? {
        id: String(user.id),
        email: user.email,
        full_name: user.name,
        company: null,
        approval:
          user.role === "recruiter"
            ? "approved"
            : "approved",
      }
    : null;

  return (
    <AuthCtx.Provider
      value={{
        user,
        session: user ? { user } : null,
        role,
        profile,
        loading,
        signOut,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);