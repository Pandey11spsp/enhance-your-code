import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  CircleX,
  UserRound,
  MapPin,
  CalendarDays,
  ArrowRight,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type DashboardSection = "profile" | "applied" | "rejected";

export function CandidateDashboard() {
  const { user, profile } = useAuth();
  const [activeSection, setActiveSection] =
    useState<DashboardSection>("applied");

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
        <h1 className="text-2xl font-semibold">Please log in</h1>
        <p className="mt-2 text-muted-foreground">
          You need to be logged in as a candidate.
        </p>
        <Button asChild className="mt-4">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (data.isLoading) {
    return <p className="text-muted-foreground">Loading your dashboard…</p>;
  }

  if (data.isError) {
    return (
      <div className="rounded-xl border bg-card p-8">
        <h1 className="text-2xl font-semibold">Unable to load your dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          {data.error instanceof Error
            ? data.error.message
            : "Something went wrong. Please try again."}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => data.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const applications = data.data ?? [];
  const rejectedApplications = applications.filter(
    (application) => application.status.toLowerCase() === "rejected"
  );
  const activeApplications = applications.filter(
    (application) => application.status.toLowerCase() !== "rejected"
  );

  const cards: {
    id: DashboardSection;
    title: string;
    description: string;
    value: string | number;
    icon: typeof UserRound;
  }[] = [
    {
      id: "profile",
      title: "My Profile",
      description: "View your account details",
      value: profile?.full_name ?? user.name,
      icon: UserRound,
    },
    {
      id: "applied",
      title: "My Applied Jobs",
      description: "Applications submitted",
      value: applications.length,
      icon: BriefcaseBusiness,
    },
    {
      id: "rejected",
      title: "My Rejections",
      description: "Applications marked rejected",
      value: rejectedApplications.length,
      icon: CircleX,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Candidate workspace</p>
          <h1 className="mt-1 text-3xl font-semibold">
            Welcome, {profile?.full_name?.split(" ")[0] ?? user.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep track of your profile and job applications in one place.
          </p>
        </div>
        <Button asChild>
          <Link to="/jobs">
            Browse jobs <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const selected = activeSection === card.id;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setActiveSection(card.id)}
              aria-pressed={selected}
              className={`rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/60 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-primary ring-1 ring-primary/30" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                {selected && (
                  <Badge variant="secondary">Selected</Badge>
                )}
              </div>
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                {card.title}
              </p>
              <p className="mt-1 truncate text-2xl font-semibold">
                {card.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {card.description}
              </p>
            </button>
          );
        })}
      </div>

      <section className="rounded-xl border bg-card p-6">
        {activeSection === "profile" && (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-semibold">My Profile</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your registered account information.
              </p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/40 p-4">
                <dt className="text-sm text-muted-foreground">Full name</dt>
                <dd className="mt-1 font-medium">{profile?.full_name ?? user.name}</dd>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <dt className="text-sm text-muted-foreground">Email address</dt>
                <dd className="mt-1 break-all font-medium">{profile?.email ?? user.email}</dd>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <dt className="text-sm text-muted-foreground">Account type</dt>
                <dd className="mt-1 font-medium capitalize">{user.role.replace("_", " ")}</dd>
              </div>
            </dl>
          </>
        )}

        {activeSection === "applied" && (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">My Applied Jobs</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  All jobs you have submitted an application for.
                </p>
              </div>
              <Badge variant="secondary">{applications.length} total</Badge>
            </div>
            {applications.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <BriefcaseBusiness className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-medium">No applications yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browse open roles and apply for a job that matches your skills.
                </p>
                <Button asChild className="mt-4">
                  <Link to="/jobs">Browse jobs</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {applications.map((application) => (
                  <li
                    key={application.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="font-medium">{application.job_title ?? `Job #${application.job_id}`}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {application.applied_at && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Applied {new Date(application.applied_at).toLocaleDateString()}
                          </span>
                        )}
                        {application.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {application.location}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge variant={application.status.toLowerCase() === "rejected" ? "destructive" : "secondary"}>
                      {stageLabel(application.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {activeSection === "rejected" && (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">My Rejections</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Applications whose current status is rejected.
                </p>
              </div>
              <Badge variant="destructive">{rejectedApplications.length} rejected</Badge>
            </div>
            {rejectedApplications.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <CircleX className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-medium">No rejected applications</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rejected applications will appear here if their status changes to Rejected.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {rejectedApplications.map((application) => (
                  <li
                    key={application.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="font-medium">{application.job_title ?? `Job #${application.job_id}`}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {application.applied_at && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Applied {new Date(application.applied_at).toLocaleDateString()}
                          </span>
                        )}
                        {application.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {application.location}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge variant="destructive">{stageLabel(application.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <div className="text-sm text-muted-foreground">
        Need to find another opportunity?{" "}
        <Link to="/jobs" className="font-medium text-primary underline">
          Browse open jobs
        </Link>
        .
      </div>
    </div>
  );
}
