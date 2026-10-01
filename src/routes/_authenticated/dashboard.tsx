import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { RecruiterDashboard } from "@/components/dashboards/RecruiterDashboard";
import { CandidateDashboard } from "@/components/dashboards/CandidateDashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — RecruitFlow" },
      { name: "description", content: "Your RecruitFlow workspace." },
      { property: "og:title", content: "Dashboard — RecruitFlow" },
      { property: "og:description", content: "Your RecruitFlow workspace." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { role, loading } = useAuth();
  if (loading || !role) return <p className="text-muted-foreground">Loading…</p>;
  if (role === "super_admin") return <AdminDashboard />;
  if (role === "recruiter") return <RecruiterDashboard />;
  return <CandidateDashboard />;
}
