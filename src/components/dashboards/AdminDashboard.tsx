import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type RecruiterRequest = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "pending" | "approved" | "rejected";
};

type RecruiterRequestsResponse = {
  success: boolean;
  requests: RecruiterRequest[];
};

export function AdminDashboard() {
  const qc = useQueryClient();

  const data = useQuery({
    queryKey: ["admin-recruiter-requests"],
    queryFn: async () => {
      const response =
        await api.get<RecruiterRequestsResponse>(
          "/admin/recruiter-requests"
        );

      return response.requests;
    },
  });

  const decide = useMutation({
    mutationFn: async ({
      id,
      decision,
    }: {
      id: number;
      decision: "approve" | "reject";
    }) => {
      return api.put(
        `/admin/recruiter-requests/${id}/${decision}`
      );
    },

    onSuccess: (_, variables) => {
      toast.success(
        variables.decision === "approve"
          ? "Recruiter approved."
          : "Recruiter rejected."
      );

      qc.invalidateQueries({
        queryKey: [
          "admin-recruiter-requests",
        ],
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

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
          Unable to load recruiter requests
        </h1>

        <p className="mt-2 text-muted-foreground">
          {data.error instanceof Error
            ? data.error.message
            : "Something went wrong."}
        </p>
      </div>
    );
  }

  const requests = data.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">
          Admin workspace
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Review recruiter registration requests.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            Recruiter approval queue
          </h2>

          <Badge variant="secondary">
            {requests.length} pending
          </Badge>
        </div>

        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending recruiter requests.
          </p>
        ) : (
          <ul className="divide-y">
            {requests.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-medium">
                    {request.name}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {request.email}
                  </p>

                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {request.role} ·{" "}
                    {request.status}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={
                      decide.isPending
                    }
                    onClick={() =>
                      decide.mutate({
                        id: request.id,
                        decision:
                          "approve",
                      })
                    }
                  >
                    Approve
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      decide.isPending
                    }
                    onClick={() =>
                      decide.mutate({
                        id: request.id,
                        decision:
                          "reject",
                      })
                    }
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}