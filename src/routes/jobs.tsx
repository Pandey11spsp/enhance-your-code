import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Open roles — RecruitFlow" },
      { name: "description", content: "Browse and apply to open positions posted by approved recruiters on RecruitFlow." },
      { property: "og:title", content: "Open roles — RecruitFlow" },
      { property: "og:description", content: "Browse and apply to open positions on RecruitFlow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const { session, role } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [wp, setWp] = useState("all");

  const jobs = useQuery({
    queryKey: ["public-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("status", "published").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const mine = useQuery({
    queryKey: ["my-app-ids", session?.user.id],
    enabled: role === "candidate",
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("job_id").eq("candidate_id", session!.user.id);
      return new Set((data ?? []).map((a) => a.job_id));
    },
  });
  const apply = useMutation({
    mutationFn: async (job_id: string) => {
      const { error } = await supabase.from("applications").insert({ job_id, candidate_id: session!.user.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Application submitted"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message.includes("duplicate") ? "You already applied to this job" : e.message),
  });

  const filtered = useMemo(() => (jobs.data ?? []).filter((j) =>
    (wp === "all" || j.workplace_type === wp) &&
    `${j.title} ${j.department ?? ""} ${j.location ?? ""}`.toLowerCase().includes(q.toLowerCase())), [jobs.data, q, wp]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Logo />
        <Button asChild>{session ? <Link to="/dashboard">Dashboard</Link> : <Link to="/auth">Sign in</Link>}</Button>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-20">
        <h1 className="text-4xl font-semibold">Open roles</h1>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Input placeholder="Search by title, team or location" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex gap-1">
            {["all", "remote", "hybrid", "onsite"].map((w) => (
              <Button key={w} size="sm" variant={wp === w ? "default" : "outline"} onClick={() => setWp(w)} className="capitalize">{w}</Button>
            ))}
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {jobs.isLoading && <p className="text-muted-foreground">Loading roles…</p>}
          {jobs.error && <p className="text-destructive">Couldn't load jobs.</p>}
          {!jobs.isLoading && filtered.length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">No roles match yet.</div>}
          {filtered.map((j) => {
            const applied = mine.data?.has(j.id);
            return (
              <div key={j.id} className="rounded-xl border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{j.title}</h3>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {j.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location}</span>}
                      <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{j.employment_type.replace("_", " ")}</span>
                      <Badge variant="secondary" className="capitalize">{j.workplace_type}</Badge>
                      {j.salary_min && <span>₹{j.salary_min.toLocaleString()}{j.salary_max ? `–${j.salary_max.toLocaleString()}` : "+"}</span>}
                    </div>
                  </div>
                  {role === "candidate" ? (
                    <Button disabled={applied || apply.isPending} onClick={() => apply.mutate(j.id)}>{applied ? "Applied" : "Apply"}</Button>
                  ) : !session ? (
                    <Button variant="outline" asChild><Link to="/auth">Sign in to apply</Link></Button>
                  ) : null}
                </div>
                {j.description && <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm">{j.description}</p>}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
