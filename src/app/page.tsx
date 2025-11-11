import { AppShell, ContentSurface } from "@/components/layout";

const readinessHighlights = [
  {
    title: "Phones first",
    detail:
      "Stacked sections, sticky header, and chip scroller keep core actions reachable on <640px screens.",
  },
  {
    title: "Tablet comfort",
    detail:
      "Two-column grid snaps in at the md breakpoint so search + data widgets breathe without horizontal scroll.",
  },
  {
    title: "Desktop lanes",
    detail:
      "XL layout introduces a right-hand insights rail the data grid, timeline, and exports can tap into.",
  },
];

const checklist = [
  { label: "Semantic landmarks", status: "header · nav · main · aside", emphasis: true },
  { label: "Max width control", status: "2xl container keeps lines readable", emphasis: false },
  { label: "Theming", status: "neutral surfaces + sky accent for actions", emphasis: false },
  { label: "Future hooks", status: "Dedicated zones for search, filters, tables", emphasis: true },
];

export default function Home() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <ContentSurface
          kicker="Task 5.1"
          title="Responsive layout foundation"
          description="Establishes the adaptive shell that the smart search, dynamic table, and journey widgets will live inside."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {readinessHighlights.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 shadow-inner"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                  {item.title}
                </p>
                <p className="mt-2 text-sm text-zinc-700">{item.detail}</p>
              </article>
            ))}
          </div>
        </ContentSurface>

        <ContentSurface
          title="Breakpoint checklist"
          description="Confirms that the same layout primitives gracefully scale from phones to widescreen analyst monitors."
        >
          <ul className="divide-y divide-zinc-100">
            {checklist.map((item) => (
              <li
                key={item.label}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-medium text-zinc-700">{item.label}</span>
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  {item.emphasis ? (
                    <strong className="font-semibold text-sky-600">{item.status}</strong>
                  ) : (
                    item.status
                  )}
                </span>
              </li>
            ))}
          </ul>
        </ContentSurface>

        <ContentSurface
          title="Next UI hooks"
          description="Slots dedicated in the layout so upcoming tasks can focus purely on their domain logic."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Search rail</p>
              <p className="mt-2 text-sm text-zinc-700">
                Context bar reserves space for the phone autocomplete, quick filters, and status
                badges described in tasks 5.2 and 5.6.
              </p>
            </article>
            <article className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Data grid zone</p>
              <p className="mt-2 text-sm text-zinc-700">
                Main column stretches with minmax logic so the responsive table, expandable rows,
                and tabbed profile views have predictable width.
              </p>
            </article>
            <article className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Insights lane</p>
              <p className="mt-2 text-sm text-zinc-700">
                Right rail (xl breakpoint) is wired for the journey timeline, export dialog, and
                other tertiary widgets without crowding the core table.
              </p>
            </article>
            <article className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Footer status</p>
              <p className="mt-2 text-sm text-zinc-700">
                Compact footer surfaces sync + latency info on mobile where the insights panel is
                intentionally hidden.
              </p>
            </article>
          </div>
        </ContentSurface>
      </div>
    </AppShell>
  );
}
