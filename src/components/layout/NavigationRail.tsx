const navItems = [
  { title: "Overview", detail: "Status & alerts", state: "active" },
  { title: "Students", detail: "Profiles & search", state: "queued" },
  { title: "Progress", detail: "Timeline + milestones", state: "queued" },
  { title: "Exports", detail: "Sheets + CSV", state: "queued" },
];

export function NavigationRail() {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Navigate</p>
      <ul className="mt-4 space-y-2">
        {navItems.map((item) => (
          <li key={item.title}>
            <button
              className="w-full rounded-2xl border border-zinc-100 px-4 py-3 text-left text-sm font-medium text-zinc-600 transition hover:border-zinc-200"
              disabled
              type="button"
            >
              <span className="block text-base font-semibold text-zinc-900">{item.title}</span>
              <span className="text-xs text-zinc-500">{item.detail}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
