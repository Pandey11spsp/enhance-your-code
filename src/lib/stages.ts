export const STAGES = [
  "applied",
  "screening",
  "shortlisted",
  "interview_scheduled",
  "interviewing",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
] as const;
export type Stage = (typeof STAGES)[number];
export const stageLabel = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
