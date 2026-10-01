import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RecruitFlow — Hiring, from posting to offer" },
      { name: "description", content: "RecruitFlow helps recruiters post jobs, track applicants through every stage, and helps candidates find and follow their applications." },
      { property: "og:title", content: "RecruitFlow — Hiring, from posting to offer" },
      { property: "og:description", content: "Post jobs, move candidates through your pipeline, and track every application in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { session } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild><Link to="/jobs">Browse jobs</Link></Button>
          {session ? (
            <Button asChild><Link to="/dashboard">Open dashboard</Link></Button>
          ) : (
            <Button asChild><Link to="/auth">Sign in</Link></Button>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <p className="mb-4 inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">Recruitment, without the spreadsheets</p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] md:text-6xl">Every candidate, every stage, one calm workspace.</h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">Recruiters post roles and move applicants from screening to offer. Candidates apply in a click and always know where they stand.</p>
        <div className="mt-8 flex gap-3">
          <Button size="lg" asChild><Link to="/auth">Create an account</Link></Button>
          <Button size="lg" variant="outline" asChild><Link to="/jobs">See open roles</Link></Button>
        </div>
        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {[
            ["For recruiters", "Post jobs, review applicants and move them through a clear pipeline."],
            ["For candidates", "Find roles, apply once, and track each application's status."],
            ["For admins", "Approve recruiters and keep an eye on platform-wide activity."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border bg-card p-6">
              <h3 className="text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
