import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MapPin,
  Briefcase,
} from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";

type Job = {
  id: number;
  recruiter_id: number;
  title: string;
  description: string;
  location?: string | null;
  employment_type?: string | null;
  experience?: string | null;
  salary?: string | null;
  skills?: string | null;
  status: "open" | "closed";
  created_at?: string;
};

type JobsResponse = {
  success: boolean;
  jobs: Job[];
};

type ApplicationsResponse = {
  success: boolean;
  applications: {
    id: number;
    job_id: number;
  }[];
};

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      {
        title: "Open roles — RecruitFlow",
      },
      {
        name: "description",
        content:
          "Browse and apply to open positions on RecruitFlow.",
      },
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
      const response =
        await api.get<JobsResponse>("/jobs");

      return response.jobs;
    },
  });

  const mine = useQuery({
    queryKey: [
      "my-app-ids",
      session?.user.id,
    ],
    enabled: role === "candidate",
    queryFn: async () => {
      const response =
        await api.get<ApplicationsResponse>(
          "/applications/my-applications"
        );

      return new Set(
        response.applications.map(
          (application) =>
            application.job_id
        )
      );
    },
  });

  const apply = useMutation({
    mutationFn: async (jobId: number) => {
      return api.post(
        `/jobs/${jobId}/apply`
      );
    },

    onSuccess: () => {
      toast.success(
        "Application submitted."
      );

      qc.invalidateQueries({
        queryKey: ["public-jobs"],
      });

      qc.invalidateQueries({
        queryKey: ["my-app-ids"],
      });

      qc.invalidateQueries({
        queryKey: ["candidate"],
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filtered = useMemo(() => {
    return (jobs.data ?? []).filter((job) => {
      const workplaceMatches =
        wp === "all" ||
        job.location
          ?.toLowerCase()
          .includes(wp);

      const searchText =
        `${job.title} ${job.location ?? ""} ${
          job.description
        } ${job.skills ?? ""}`.toLowerCase();

      return (
        workplaceMatches &&
        searchText.includes(q.toLowerCase())
      );
    });
  }, [jobs.data, q, wp]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Logo />

        <Button asChild>
          {session ? (
            <Link to="/dashboard">
              Dashboard
            </Link>
          ) : (
            <Link to="/auth">
              Sign in
            </Link>
          )}
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <h1 className="text-4xl font-semibold">
          Open roles
        </h1>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Search by title, team or location"
            value={q}
            onChange={(event) =>
              setQ(event.target.value)
            }
          />

          <div className="flex gap-1">
            {[
              "all",
              "remote",
              "hybrid",
              "onsite",
            ].map((item) => (
              <Button
                key={item}
                size="sm"
                variant={
                  wp === item
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  setWp(item)
                }
                className="capitalize"
              >
                {item}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {jobs.isLoading && (
            <p className="text-muted-foreground">
              Loading roles…
            </p>
          )}

          {jobs.isError && (
            <p className="text-destructive">
              {jobs.error instanceof Error
                ? jobs.error.message
                : "Couldn't load jobs."}
            </p>
          )}

          {!jobs.isLoading &&
            filtered.length === 0 && (
              <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                No roles match yet.
              </div>
            )}

          {filtered.map((job) => {
            const applied =
              mine.data?.has(job.id);

            return (
              <div
                key={job.id}
                className="rounded-xl border bg-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {job.title}
                    </h3>

                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                      )}

                      {job.employment_type && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {job.employment_type.replace(
                            "_",
                            " "
                          )}
                        </span>
                      )}

                      {job.experience && (
                        <Badge variant="secondary">
                          {job.experience}
                        </Badge>
                      )}

                      {job.salary && (
                        <span>
                          {job.salary}
                        </span>
                      )}
                    </div>
                  </div>

                  {role === "candidate" ? (
                    <Button
                      disabled={
                        applied ||
                        apply.isPending
                      }
                      onClick={() =>
                        apply.mutate(job.id)
                      }
                    >
                      {applied
                        ? "Applied"
                        : "Apply"}
                    </Button>
                  ) : !session ? (
                    <Button
                      variant="outline"
                      asChild
                    >
                      <Link to="/auth">
                        Sign in to apply
                      </Link>
                    </Button>
                  ) : null}
                </div>

                {job.description && (
                  <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm">
                    {job.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}