import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-display text-lg font-semibold ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-highlight text-sm font-bold text-foreground">R</span>
      RecruitFlow
    </Link>
  );
}
