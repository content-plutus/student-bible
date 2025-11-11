import { cn } from "@/lib/utils/cn";

type ContextBarProps = {
  className?: string;
};

const contextItems = [
  { label: "Smart search", detail: "Task 5.2", accent: "bg-sky-100 text-sky-700" },
  { label: "Progress cues", detail: "Task 5.6", accent: "bg-emerald-100 text-emerald-700" },
  { label: "Timeline", detail: "Task 5.7", accent: "bg-amber-100 text-amber-700" },
  { label: "Exports", detail: "Task 5.8", accent: "bg-indigo-100 text-indigo-700" },
];

export function ContextBar({ className }: ContextBarProps) {
  return (
    <section
      aria-label="Workspace controls"
      className={cn(
        "rounded-2xl border border-white/60 bg-white/90 px-4 py-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60",
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1 text-sm text-zinc-500 sm:flex-row sm:items-center sm:gap-3">
          <p className="font-semibold uppercase tracking-[0.2em] text-zinc-400">Workspace</p>
          <span className="text-zinc-600">Mobile-first layout ready for upcoming UI tasks</span>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden />
          <span>Adaptive grid unlocks nav + insights sidecars</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div
          aria-label="Phone lookup placeholder"
          className="flex flex-1 items-center justify-between rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3"
          role="group"
        >
          <div className="text-sm text-zinc-500">
            <span className="font-medium text-zinc-700">Phone lookup</span>
            <span className="ml-2 text-xs text-zinc-400">Task 5.2 wires this up</span>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-500">Coming soon</span>
        </div>
        <div className="flex gap-2 overflow-x-auto" role="list">
          {contextItems.map((item) => (
            <div
              key={item.label}
              role="listitem"
              className="min-w-fit rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-500 shadow-sm"
            >
              <span className="block text-[0.65rem] uppercase tracking-widest text-zinc-400">{item.detail}</span>
              <span className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-[0.68rem]", item.accent)}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

