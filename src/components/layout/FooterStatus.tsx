import { cn } from "@/lib/utils/cn";

type FooterStatusProps = {
  className?: string;
};

export function FooterStatus({ className }: FooterStatusProps) {
  return (
    <footer
      className={cn(
        "rounded-2xl border border-white/60 bg-white/90 px-4 py-4 text-sm text-zinc-500 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60",
        className,
      )}
    >
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Status</p>
      <p className="mt-2">
        Layout grid, navigation rail, and insights lane are ready for the upcoming smart search and
        data grid workstreams.
      </p>
    </footer>
  );
}
