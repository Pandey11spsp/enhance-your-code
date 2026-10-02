import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  MapPin,
  UserRound,
  Users,
} from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { StatCard, StageBars } from "@/components/StatCard";
import { STAGES, stageLabel, type Stage } from "@/lib/stages";
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

type Application = {
  id: number;
  job_id: number;
  candidate_id: number;
  status: Stage;
  applied_at: string;
  job_title: string;
  candidate_name: string;
  candidate_email: string;
};

type ApplicationsResponse = {
  success: boolean;
  applications: Application[];
};

type CandidateProfile = {
  application_id: number;
  job_id: number;
  candidate_id: number;
  status: Stage;
  applied_at: string;
  job_title: string;
  job_location?: string | null;
  candidate_name: string;
  candidate_email: string;
  candidate_role: string;
};

type CandidateProfileResponse = {
  success: boolean;
  candidate: CandidateProfile;
};

type UpdateStatusRequest = {
  id: number;
  status: Stage;
};

export function RecruiterDashboard() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const uid = user?.id;
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);

  const jobsQuery = useQuery({
    queryKey: ["recruiter-jobs", uid],
    enabled: !!uid,
    queryFn: async () => {
      const response = await api.get<JobsResponse>("/jobs/my-postings");
      return response.jobs;
    },
  });

  const applicationsQuery = useQuery({
    queryKey: ["recruiter-applications", uid],
    enabled: !!uid,
    queryFn: async () => {
      const response = await api.get<ApplicationsResponse>(
        "/applications/recruiter-applications"
      );
      return response.applications;
    },
  });

  const candidateProfileQuery = useQuery({
    queryKey: [
      "recruiter-candidate-profile",
      uid,
      selectedApplication?.id,
    ],
    enabled: !!uid && !!selectedApplication,
    queryFn: async () => {
      const response = await api.get<CandidateProfileResponse>(
        `/applications/${selectedApplication!.id}/candidate-profile`
      );
      return response.candidate;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: UpdateStatusRequest) => {
      return api.put(`/applications/${id}/status`, { status });
    },
    onSuccess: (_, variables) => {
      toast.success("Application stage updated.");

      qc.invalidateQueries({
        queryKey: ["recruiter-applications", uid],
      });

      qc.invalidateQueries({
        queryKey: [
          "recruiter-candidate-profile",
          uid,
          variables.id,
        ],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const closeJob = useMutation({
    mutationFn: async (jobId: number) => {
      return api.put(`/jobs/${jobId}/close`);
    },
    onSuccess: () => {
      toast.success("Job closed.");

      qc.invalidateQueries({
        queryKey: ["recruiter-jobs", uid],
      });

      qc.invalidateQueries({
        queryKey: ["jobs"],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (!uid) {
    return (
      <div className="rounded-xl border bg-card p-8">
        <h1 className="text-2xl font-semibold">Please log in</h1>
        <p className="mt-2 text-muted-foreground">
          You need to be logged in as a recruiter to access this dashboard.
        </p>
      </div>
    );
  }

  if (profile?.approval && profile.approval !== "approved") {
    return (
      <div className="rounded-xl border bg-card p-8">
        <h1 className="text-2xl font-semibold">
          Your account is {profile.approval}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {profile.approval === "rejected"
            ? "An administrator declined this recruiter account."
            : "An administrator needs to approve your recruiter account before you can post jobs."}
        </p>
      </div>
    );
  }

  if (jobsQuery.isLoading || applicationsQuery.isLoading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (jobsQuery.isError) {
    return (
      <div className="rounded-xl border bg-card p-8">
        <h1 className="text-2xl font-semibold">Unable to load your jobs</h1>
        <p className="mt-2 text-muted-foreground">
          {(jobsQuery.error as Error)?.message ||
            "Something went wrong while loading your jobs."}
        </p>
      </div>
    );
  }

  if (applicationsQuery.isError) {
    return (
      <div className="rounded-xl border bg-card p-8">
        <h1 className="text-2xl font-semibold">
          Unable to load applications
        </h1>
        <p className="mt-2 text-muted-foreground">
          {(applicationsQuery.error as Error)?.message ||
            "Something went wrong while loading applications."}
        </p>
      </div>
    );
  }

  const jobs = jobsQuery.data ?? [];
  const applications = applicationsQuery.data ?? [];

  const stages: Record<string, number> = {};
  applications.forEach((application) => {
    stages[application.status] = (stages[application.status] ?? 0) + 1;
  });

  const perJob = new Map<number, number>();
  applications.forEach((application) => {
    perJob.set(
      application.job_id,
      (perJob.get(application.job_id) ?? 0) + 1
    );
  });

  const activeJobs = jobs.filter((job) => job.status === "open").length;

  const interviewCount =
    (stages["interview_scheduled"] ?? 0) +
    (stages["interviewing"] ?? 0);

  const hiredCount = stages["hired"] ?? 0;

  const selectedJobApplications = selectedJob
    ? applications.filter(
        (application) => application.job_id === selectedJob.id
      )
    : [];

  const openCandidateProfile = (application: Application) => {
    setSelectedApplication(application);
  };

  const closeCandidateProfile = () => {
    setSelectedApplication(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Hiring workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your jobs and candidate pipeline.
          </p>
        </div>

        <NewJobDialog
          onDone={() => {
            qc.invalidateQueries({
              queryKey: ["recruiter-jobs", uid],
            });
            qc.invalidateQueries({
              queryKey: ["jobs"],
            });
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active jobs" value={activeJobs} />
        <StatCard label="Applications" value={applications.length} />
        <StatCard label="In interview" value={interviewCount} />
        <StatCard label="Hired" value={hiredCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Pipeline</h2>

          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your candidate pipeline will appear here once candidates apply.
            </p>
          ) : (
            <StageBars counts={stages} />
          )}
        </section>

        <section className="rounded-xl border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">My jobs</h2>
            <Badge variant="secondary">{jobs.length} total</Badge>
          </div>

          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Post your first job to start receiving applicants.
            </p>
          ) : (
            <ul className="divide-y">
              {jobs.map((job) => {
                const applicantCount = perJob.get(job.id) ?? 0;

                return (
                  <li
                    key={job.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{job.title}</p>

                      <button
                        type="button"
                        onClick={() => setSelectedJob(job)}
                        className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Users className="h-3.5 w-3.5" />
                        {applicantCount} applicant
                        {applicantCount === 1 ? "" : "s"}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          job.status === "open" ? "default" : "secondary"
                        }
                        className="capitalize"
                      >
                        {job.status}
                      </Badge>

                      {job.status === "open" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={closeJob.isPending}
                          onClick={() => closeJob.mutate(job.id)}
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Recent applicants</h2>
          <Badge variant="secondary">
            {applications.length} applications
          </Badge>
        </div>

        {applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applicants yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Candidate</th>
                  <th className="pr-4">Job</th>
                  <th className="pr-4">Applied</th>
                  <th>Stage</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {applications.slice(0, 20).map((application) => (
                  <tr key={application.id}>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => openCandidateProfile(application)}
                        className="text-left hover:underline"
                      >
                        <p className="font-medium text-primary">
                          {application.candidate_name || "Candidate"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {application.candidate_email}
                        </p>
                      </button>
                    </td>

                    <td className="pr-4">
                      <button
                        type="button"
                        onClick={() => {
                          const job = jobs.find(
                            (item) => item.id === application.job_id
                          );
                          if (job) setSelectedJob(job);
                        }}
                        className="text-left hover:underline"
                      >
                        {application.job_title}
                      </button>
                    </td>

                    <td className="pr-4 text-muted-foreground">
                      {application.applied_at
                        ? new Date(
                            application.applied_at
                          ).toLocaleDateString()
                        : "—"}
                    </td>

                    <td>
                      {application.status === "withdrawn" ? (
                        <Badge variant="secondary">Withdrawn</Badge>
                      ) : (
                        <Select
                          value={application.status}
                          onValueChange={(value) =>
                            updateStatus.mutate({
                              id: application.id,
                              status: value as Stage,
                            })
                          }
                          disabled={updateStatus.isPending}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            {STAGES.filter(
                              (stage) => stage !== "withdrawn"
                            ).map((stage) => (
                              <SelectItem key={stage} value={stage}>
                                {stageLabel(stage)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog
        open={!!selectedJob}
        onOpenChange={(open) => {
          if (!open) setSelectedJob(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedJob?.title ?? "Job"} — applicants
            </DialogTitle>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-5">
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{selectedJob.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedJob.location || "Location not specified"}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {selectedJobApplications.length} applicants
                  </Badge>
                </div>
              </div>

              {selectedJobApplications.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 font-medium">No applicants yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Applicants for this job will appear here.
                  </p>
                </div>
              ) : (
                <div className="max-h-[55vh] overflow-y-auto rounded-lg border">
                  <ul className="divide-y">
                    {selectedJobApplications.map((application) => (
                      <li
                        key={application.id}
                        className="flex flex-wrap items-center justify-between gap-4 p-4"
                      >
                        <button
                          type="button"
                          onClick={() => openCandidateProfile(application)}
                          className="min-w-0 text-left"
                        >
                          <p className="font-medium text-primary hover:underline">
                            {application.candidate_name || "Candidate"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {application.candidate_email}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Applied{" "}
                            {new Date(
                              application.applied_at
                            ).toLocaleDateString()}
                          </p>
                        </button>

                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              application.status === "rejected"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {stageLabel(application.status)}
                          </Badge>

                          {application.status !== "withdrawn" && (
                            <Select
                              value={application.status}
                              onValueChange={(value) =>
                                updateStatus.mutate({
                                  id: application.id,
                                  status: value as Stage,
                                })
                              }
                              disabled={updateStatus.isPending}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STAGES.filter(
                                  (stage) => stage !== "withdrawn"
                                ).map((stage) => (
                                  <SelectItem
                                    key={stage}
                                    value={stage}
                                  >
                                    {stageLabel(stage)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedApplication}
        onOpenChange={(open) => {
          if (!open) closeCandidateProfile();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Candidate profile</DialogTitle>
          </DialogHeader>

          {candidateProfileQuery.isLoading && (
            <p className="text-sm text-muted-foreground">
              Loading candidate profile…
            </p>
          )}

          {candidateProfileQuery.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
              <p className="font-medium">Unable to load candidate profile</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {(candidateProfileQuery.error as Error)?.message ||
                  "Something went wrong while loading this candidate."}
              </p>
            </div>
          )}

          {candidateProfileQuery.data && (
            <CandidateProfilePanel
              candidate={candidateProfileQuery.data}
              updateStatus={updateStatus}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CandidateProfilePanel({
  candidate,
  updateStatus,
}: {
  candidate: CandidateProfile;
  updateStatus: ReturnType<typeof useMutation>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="h-7 w-7" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-2xl font-semibold">
            {candidate.candidate_name || "Candidate"}
          </h3>
          <p className="mt-1 flex items-center gap-2 break-all text-sm text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            {candidate.candidate_email}
          </p>
        </div>

        <Badge
          variant={
            candidate.status === "rejected" ? "destructive" : "secondary"
          }
        >
          {stageLabel(candidate.status)}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Applied for</p>
          <p className="mt-1 font-medium">{candidate.job_title}</p>
        </div>

        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Application date</p>
          <p className="mt-1 flex items-center gap-2 font-medium">
            <CalendarDays className="h-4 w-4" />
            {new Date(candidate.applied_at).toLocaleDateString()}
          </p>
        </div>

        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Location</p>
          <p className="mt-1 flex items-center gap-2 font-medium">
            <MapPin className="h-4 w-4" />
            {candidate.job_location || "Not specified"}
          </p>
        </div>

        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Account type</p>
          <p className="mt-1 font-medium capitalize">
            {candidate.candidate_role.replace("_", " ")}
          </p>
        </div>
      </div>

      <div className="border-t pt-5">
        <p className="mb-3 text-sm font-medium">Application workflow</p>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={candidate.status}
            onValueChange={(value) =>
              updateStatus.mutate({
                id: candidate.application_id,
                status: value as Stage,
              })
            }
            disabled={
              updateStatus.isPending || candidate.status === "withdrawn"
            }
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.filter((stage) => stage !== "withdrawn").map(
                (stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stageLabel(stage)}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          {updateStatus.isPending && (
            <span className="text-sm text-muted-foreground">
              Updating…
            </span>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Changes here update the candidate's application status. The
          candidate dashboard will show the new status the next time it
          refreshes.
        </p>
      </div>
    </div>
  );
}

function NewJobDialog({
  onDone,
}: {
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [employmentType, setEmploymentType] = useState("full_time");

  const submit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();
    const experience = String(form.get("experience") ?? "").trim();
    const salary = String(form.get("salary") ?? "").trim();
    const skills = String(form.get("skills") ?? "").trim();

    if (!title || !description) {
      toast.error("Job title and description are required.");
      return;
    }

    setBusy(true);

    try {
      await api.post("/jobs", {
        title,
        description,
        location: location || null,
        employment_type: employmentType,
        experience: experience || null,
        salary: salary || null,
        skills: skills || null,
      });

      toast.success("Job posted successfully.");
      setOpen(false);
      event.currentTarget.reset();
      setEmploymentType("full_time");
      onDone();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create job."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Post a job</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post a job</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Job title</Label>
            <Input
              name="title"
              required
              maxLength={120}
              placeholder="e.g. Senior Project Manager"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                name="location"
                maxLength={100}
                placeholder="e.g. Noida / Remote"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Employment type</Label>
              <Select
                value={employmentType}
                onValueChange={setEmploymentType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full time</SelectItem>
                  <SelectItem value="part_time">Part time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Experience</Label>
              <Input
                name="experience"
                maxLength={80}
                placeholder="e.g. 5+ years"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Salary</Label>
              <Input
                name="salary"
                maxLength={100}
                placeholder="e.g. ₹15-20 LPA"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Skills</Label>
            <Input
              name="skills"
              maxLength={500}
              placeholder="e.g. Agile, Scrum, Jira, AWS"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              name="description"
              rows={6}
              required
              maxLength={5000}
              placeholder="Describe the role, responsibilities and requirements..."
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={busy}
          >
            {busy ? "Publishing..." : "Publish job"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
