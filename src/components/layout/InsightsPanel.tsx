const insightCards = [
  { label: "Batches", value: "12", helper: "next refresh 02:00" },
  { label: "Students tracked", value: "8,410", helper: "+145 this week" },
  { label: "Data freshness", value: "97%", helper: "forms synced overnight" },
];

export function InsightsPanel() {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-stone-200/60 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Snapshot</p>
      <ul className="mt-4 space-y-3">
        {insightCards.map((card) => (
          <li key={card.label} className="rounded-2xl border border-zinc-100 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{card.value}</p>
            <p className="text-xs text-zinc-500">{card.helper}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

