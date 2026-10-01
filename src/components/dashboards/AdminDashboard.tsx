import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatCard, StageBars } from "@/components/StatCard";

export function AdminDashboard() {
  const qc = useQueryClient();
  const data = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [profiles, roles, jobs, apps] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("jobs").select("id, status"),
        supabase.from("applications").select("id, stage"),
      ]);
      const roleOf = new Map((roles.data ?? []).map((r) => [r.user_id, r.role]));
      return { profiles: profiles.data ?? [], roleOf, jobs: jobs.data ?? [], apps: apps.data ?? [] };
    },
  });
  const decide = useMutation({
    mutationFn: async ({ id, approval }: { id: string; approval: "approved" | "rejected" }) => {
      const { error } = await supabase.from("profiles").update({ approval }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(`Recruiter ${v.approval}`); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (data.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  const d = data.data!;
  const recruiters = d.profiles.filter((p) => d.roleOf.get(p.id) === "recruiter");
  const pending = recruiters.filter((p) => p.approval === "pending");
  const stages: Record<string, number> = {};
  d.apps.forEach((a) => (stages[a.stage] = (stages[a.stage] ?? 0) + 1));

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Platform overview</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard label="Users" value={d.profiles.length} />
        <StatCard label="Recruiters" value={recruiters.length} />
        <StatCard label="Candidates" value={d.profiles.filter((p) => d.roleOf.get(p.id) === "candidate").length} />
        <StatCard label="Pending" value={pending.length} hint="Awaiting approval" />
        <StatCard label="Jobs" value={d.jobs.length} />
        <StatCard label="Applications" value={d.apps.length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Recruiter approval queue</h2>
          {pending.length === 0 ? <p className="text-sm text-muted-foreground">All caught up.</p> : (
            <ul className="divide-y">
              {pending.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div><p className="font-medium">{p.full_name}</p><p className="text-xs text-muted-foreground">{p.email} · {p.company}</p></div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decide.mutate({ id: p.id, approval: "approved" })}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: p.id, approval: "rejected" })}>Reject</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Applications by stage</h2>
          <StageBars counts={stages} />
        </section>
      </div>
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Newest users</h2>
        <ul className="divide-y text-sm">
          {d.profiles.slice(0, 8).map((p) => (
            <li key={p.id} className="flex justify-between py-2">
              <span>{p.full_name} <span className="text-muted-foreground">· {p.email}</span></span>
              <span className="capitalize text-muted-foreground">{d.roleOf.get(p.id)?.replace("_", " ")} {d.roleOf.get(p.id) === "recruiter" && `(${p.approval})`}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
