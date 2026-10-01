import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard, StageBars } from "@/components/StatCard";
import { stageLabel } from "@/lib/stages";

export function CandidateDashboard() {
  const { session, profile } = useAuth();
  const uid = session!.user.id;
  const qc = useQueryClient();
  const data = useQuery({
    queryKey: ["candidate", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("applications").select("*, jobs(title, location, workplace_type)").eq("candidate_id", uid).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const withdraw = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("applications").update({ stage: "withdrawn", updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Application withdrawn"); qc.invalidateQueries({ queryKey: ["candidate", uid] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (data.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  const apps = data.data ?? [];
  const stages: Record<string, number> = {};
  apps.forEach((a) => (stages[a.stage] = (stages[a.stage] ?? 0) + 1));
  const active = apps.filter((a) => !["rejected", "withdrawn", "hired"].includes(a.stage)).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Hi {profile?.full_name?.split(" ")[0]}</h1>
        <Button asChild><Link to="/jobs">Find jobs</Link></Button>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Applications" value={apps.length} />
        <StatCard label="Active" value={active} />
        <StatCard label="Interviews" value={(stages["interview_scheduled"] ?? 0) + (stages["interviewing"] ?? 0)} />
        <StatCard label="Offers" value={(stages["offer"] ?? 0) + (stages["hired"] ?? 0)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">My applications</h2>
          {apps.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven't applied anywhere yet. <Link to="/jobs" className="font-medium text-primary underline">Browse open roles</Link>.</p>
          ) : (
            <ul className="divide-y">
              {apps.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{a.jobs?.title ?? "Job removed"}</p>
                    <p className="text-xs text-muted-foreground">Applied {new Date(a.created_at).toLocaleDateString()} · {a.jobs?.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.stage === "rejected" ? "destructive" : "secondary"}>{stageLabel(a.stage)}</Badge>
                    {!["withdrawn", "rejected", "hired"].includes(a.stage) && (
                      <Button size="sm" variant="ghost" onClick={() => withdraw.mutate(a.id)}>Withdraw</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">By status</h2>
          <StageBars counts={stages} />
        </section>
      </div>
    </div>
  );
}
