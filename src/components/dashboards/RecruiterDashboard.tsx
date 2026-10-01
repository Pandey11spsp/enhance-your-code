import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard, StageBars } from "@/components/StatCard";
import { STAGES, stageLabel, type Stage } from "@/lib/stages";

export function RecruiterDashboard() {
  const { session, profile } = useAuth();
  const qc = useQueryClient();
  const uid = session!.user.id;

  const data = useQuery({
    queryKey: ["recruiter", uid],
    queryFn: async () => {
      const { data: jobs } = await supabase.from("jobs").select("*").eq("recruiter_id", uid).order("created_at", { ascending: false });
      const ids = (jobs ?? []).map((j) => j.id);
      const { data: apps } = ids.length
        ? await supabase.from("applications").select("*").in("job_id", ids).order("updated_at", { ascending: false })
        : { data: [] };
      const cids = [...new Set((apps ?? []).map((a) => a.candidate_id))];
      const { data: people } = cids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", cids) : { data: [] };
      return { jobs: jobs ?? [], apps: apps ?? [], people: new Map((people ?? []).map((p) => [p.id, p])) };
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: Stage }) => {
      const { error } = await supabase.from("applications").update({ stage, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Stage updated"); qc.invalidateQueries({ queryKey: ["recruiter", uid] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "published" | "closed" | "archived" | "draft" }) => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recruiter", uid] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (profile?.approval !== "approved") {
    return (
      <div className="rounded-xl border bg-card p-8">
        <h1 className="text-2xl font-semibold">Your account is {profile?.approval}</h1>
        <p className="mt-2 text-muted-foreground">
          {profile?.approval === "rejected" ? "An administrator declined this recruiter account." : "An administrator needs to approve your recruiter account before you can post jobs."}
        </p>
      </div>
    );
  }
  if (data.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  const d = data.data!;
  const stages: Record<string, number> = {};
  d.apps.forEach((a) => (stages[a.stage] = (stages[a.stage] ?? 0) + 1));
  const perJob = new Map<string, number>();
  d.apps.forEach((a) => perJob.set(a.job_id, (perJob.get(a.job_id) ?? 0) + 1));
  const jobTitle = new Map(d.jobs.map((j) => [j.id, j.title]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Hiring workspace</h1>
        <NewJobDialog uid={uid} onDone={() => qc.invalidateQueries()} />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active jobs" value={d.jobs.filter((j) => j.status === "published").length} />
        <StatCard label="Applications" value={d.apps.length} />
        <StatCard label="In interview" value={(stages["interview_scheduled"] ?? 0) + (stages["interviewing"] ?? 0)} />
        <StatCard label="Hired" value={stages["hired"] ?? 0} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Pipeline</h2>
          <StageBars counts={stages} />
        </section>
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">My jobs</h2>
          {d.jobs.length === 0 ? <p className="text-sm text-muted-foreground">Post your first job to start receiving applicants.</p> : (
            <ul className="divide-y">
              {d.jobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div><p className="font-medium">{j.title}</p><p className="text-xs text-muted-foreground">{perJob.get(j.id) ?? 0} applicants</p></div>
                  <Select value={j.status} onValueChange={(v) => setStatus.mutate({ id: j.id, status: v as "published" })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{["draft", "published", "closed", "archived"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Recent applicants</h2>
        {d.apps.length === 0 ? <p className="text-sm text-muted-foreground">No applicants yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2">Candidate</th><th>Job</th><th>Applied</th><th>Stage</th></tr></thead>
              <tbody className="divide-y">
                {d.apps.slice(0, 20).map((a) => {
                  const p = d.people.get(a.candidate_id);
                  return (
                    <tr key={a.id}>
                      <td className="py-2.5"><p className="font-medium">{p?.full_name ?? "Candidate"}</p><p className="text-xs text-muted-foreground">{p?.email}</p></td>
                      <td>{jobTitle.get(a.job_id)}</td>
                      <td className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td>
                        {a.stage === "withdrawn" ? <Badge variant="secondary">Withdrawn</Badge> : (
                          <Select value={a.stage} onValueChange={(v) => move.mutate({ id: a.id, stage: v as Stage })}>
                            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>{STAGES.filter((s) => s !== "withdrawn").map((s) => <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function NewJobDialog({ uid, onDone }: { uid: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wp, setWp] = useState("onsite");
  const [et, setEt] = useState("full_time");
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => (f.get(k) ? Number(f.get(k)) : null);
    setBusy(true);
    const { error } = await supabase.from("jobs").insert({
      recruiter_id: uid,
      title: String(f.get("title")).trim(),
      description: String(f.get("description")),
      department: String(f.get("department")) || null,
      location: String(f.get("location")) || null,
      workplace_type: wp,
      employment_type: et,
      salary_min: num("salary_min"),
      salary_max: num("salary_max"),
      vacancies: num("vacancies") ?? 1,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Job published");
    setOpen(false);
    onDone();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Post a job</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Post a job</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label>Job title</Label><Input name="title" required maxLength={120} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Department</Label><Input name="department" maxLength={60} /></div>
            <div className="space-y-1.5"><Label>Location</Label><Input name="location" maxLength={80} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Workplace</Label>
              <Select value={wp} onValueChange={setWp}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["onsite", "hybrid", "remote"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={et} onValueChange={setEt}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["full_time", "part_time", "contract", "internship"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Salary min</Label><Input name="salary_min" type="number" min={0} /></div>
            <div className="space-y-1.5"><Label>Salary max</Label><Input name="salary_max" type="number" min={0} /></div>
            <div className="space-y-1.5"><Label>Vacancies</Label><Input name="vacancies" type="number" min={1} defaultValue={1} /></div>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea name="description" rows={5} required maxLength={5000} /></div>
          <Button className="w-full" disabled={busy}>Publish job</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
