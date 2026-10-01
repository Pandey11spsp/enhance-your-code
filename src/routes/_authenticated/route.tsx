import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import {
  LayoutDashboard,
  Briefcase,
  LogOut,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute(
  "/_authenticated"
)({
  ssr: false,

  beforeLoad: () => {
    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      throw redirect({
        to: "/auth",
      });
    }
  },

  component: Shell,
});

function Shell() {
  const {
    profile,
    role,
    signOut,
  } = useAuth();

  const item =
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
        <Logo className="mb-8 px-2" />

        <nav className="space-y-1">
          <Link
            to="/dashboard"
            className={item}
            activeProps={{
              className:
                "bg-sidebar-accent text-sidebar-accent-foreground",
            }}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          <Link
            to="/jobs"
            className={item}
          >
            <Briefcase className="h-4 w-4" />
            Browse jobs
          </Link>
        </nav>

        <div className="mt-auto rounded-lg bg-sidebar-accent p-3 text-sm">
          <p className="font-semibold">
            {profile?.full_name ?? "…"}
          </p>

          <p className="text-xs capitalize text-sidebar-foreground/70">
            {role?.replace(
              "_",
              " "
            )}
          </p>

          <button
            type="button"
            onClick={signOut}
            className="mt-3 flex items-center gap-1 text-xs text-sidebar-foreground/80 hover:text-sidebar-foreground"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <div className="flex items-center justify-between border-b px-4 py-3 md:hidden">
          <Logo />

          <button
            type="button"
            onClick={signOut}
            className="text-sm text-muted-foreground"
          >
            Sign out
          </button>
        </div>

        <main className="mx-auto max-w-6xl p-6 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}