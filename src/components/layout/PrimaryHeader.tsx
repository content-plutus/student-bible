import { cn } from "@/lib/utils/cn";

type PrimaryHeaderProps = {
  className?: string;
};

export function PrimaryHeader({ className }: PrimaryHeaderProps) {
  return (
    <header
      className={cn(
        "rounded-3xl border border-white/70 bg-white/90 px-4 py-5 shadow-lg shadow-stone-200/60 backdrop-blur supports-[backdrop-filter]:bg-white/70",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">Student Bible</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Centralized intelligence hub</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Responsive shell for enrollment, mentorship, and exam workflows.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm sm:items-end">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            Internal build
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300"
              type="button"
              disabled
            >
              Export queue
            </button>
            <button
              className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500"
              type="button"
              disabled
            >
              Manual sync
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

