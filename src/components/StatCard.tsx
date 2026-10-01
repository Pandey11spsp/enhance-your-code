export function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StageBars({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (!entries.length) return <p className="text-sm text-muted-foreground">No applications yet.</p>;
  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-3 text-sm">
          <span className="w-36 shrink-0 capitalize text-muted-foreground">{k.replace(/_/g, " ")}</span>
          <div className="h-2.5 flex-1 rounded-full bg-muted"><div className="h-2.5 rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
          <span className="w-8 text-right font-semibold">{v}</span>
        </div>
      ))}
    </div>
  );
}
