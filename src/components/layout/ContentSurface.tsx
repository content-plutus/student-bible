import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type ContentSurfaceProps = {
  title: string;
  kicker?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function ContentSurface({
  title,
  kicker,
  description,
  children,
  actions,
  className,
}: ContentSurfaceProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-white/70 bg-white/95 p-5 shadow-lg shadow-stone-200/60 backdrop-blur supports-[backdrop-filter]:bg-white/70",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {kicker ? (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">
              {kicker}
            </p>
          ) : null}
          <h2 className="mt-1 text-xl font-semibold text-zinc-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="mt-4 text-sm text-zinc-700">{children}</div>
    </section>
  );
}
