import { Link } from "@tanstack/react-router";
import {
  useQuery,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  StatCard,
  StageBars,
} from "@/components/StatCard";
import { stageLabel } from "@/lib/stages";

type Application = {
  id: number;
  job_id: number;
  status: string;
  applied_at?: string;
  job_title?: string;
  location?: string | null;
};

type ApplicationsResponse = {
  success: boolean;
  applications: Application[];
};

export function CandidateDashboard() {
  const { user, profile } = useAuth();

  const uid = user?.id;

  const data = useQuery({
    queryKey: ["candidate", uid],
    enabled: !!uid,
    queryFn: async () => {
      const response =
        await api.get<ApplicationsResponse>(
          "/applications/my-applications"
        );

      return response.applications;
    },
  });

  if (!uid) {
    return (
      <div className="rounded-xl border bg-card p-8">
        <h1 className="text-2xl font-semibold">
          Please log in
        </h1>

        <p className="mt-2 text-muted-foreground">
          You need to be logged in as a candidate.
        </p>
      </div>
    );
  }

  if (data.isLoading) {
    return (
      <p className="text-muted-foreground">
        Loading…
      </p>
    );
  }

  if (data.isError) {
    return (
      <div className="rounded-xl border bg-card p-8">
        <h1 className="text-2xl font-semibold">
          Unable to load applications
        </h1>

        <p className="mt-2 text-muted-foreground">
          {data.error instanceof Error
            ? data.error.message
            : "Something went wrong."}
        </p>
      </div>
    );
  }

  const applications = data.data ?? [];

  const stages: Record<string, number> = {};

  applications.forEach(
    (application) => {
      stages[application.status] =
        (stages[application.status] ?? 0) + 1;
    }
  );

  const active = applications.filter(
    (application) =>
      ![
        "rejected",
        "withdrawn",
        "hired",
      ].includes(application.status)
  ).length;

  const interviews =
    (stages["interview_scheduled"] ?? 0) +
    (stages["interviewing"] ?? 0);

  const offers =
    (stages["offer"] ?? 0) +
    (stages["hired"] ?? 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">
          Hi{" "}
          {profile?.full_name?.split(
            " "
          )[0] ?? "there"}
        </h1>

        <Button asChild>
          <Link to="/jobs">
            Find jobs
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Applications"
          value={applications.length}
        />

        <StatCard
          label="Active"
          value={active}
        />

        <StatCard
          label="Interviews"
          value={interviews}
        />

        <StatCard
          label="Offers"
          value={offers}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">
            My applications
          </h2>

          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven't applied anywhere yet.{" "}
              <Link
                to="/jobs"
                className="font-medium text-primary underline"
              >
                Browse open roles
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y">
              {applications.map(
                (application) => (
                  <li
                    key={application.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {application.job_title ??
                          "Job"}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {application.applied_at
                          ? `Applied ${new Date(
                              application.applied_at
                            ).toLocaleDateString()}`
                          : "Application submitted"}

                        {application.location
                          ? ` · ${application.location}`
                          : ""}
                      </p>
                    </div>

                    <Badge
                      variant={
                        application.status ===
                        "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {stageLabel(
                        application.status
                      )}
                    </Badge>
                  </li>
                )
              )}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">
            By status
          </h2>

          <StageBars
            counts={stages}
          />
        </section>
      </div>
    </div>
  );
}