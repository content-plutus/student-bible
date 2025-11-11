import type { MouseEvent } from "react";

import { cn } from "@/lib/utils/cn";

type NavItem = {
  title: string;
  detail: string;
  isActive?: boolean;
  comingSoon?: boolean;
};

const navItems: NavItem[] = [
  { title: "Overview", detail: "Status & alerts", isActive: true },
  { title: "Students", detail: "Profiles & search", comingSoon: true },
  { title: "Progress", detail: "Timeline + milestones", comingSoon: true },
  { title: "Exports", detail: "Sheets + CSV", comingSoon: true },
];

function handleNavClick(event: MouseEvent<HTMLButtonElement>, isComingSoon: boolean) {
  if (isComingSoon) {
    event.preventDefault();
    event.stopPropagation();
  }
}

export function NavigationRail() {
  return (
    <nav
      aria-label="Sidebar navigation"
      className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70"
    >
      <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Navigate</h2>
      <ul className="mt-4 space-y-2">
        {navItems.map((item) => {
          const isComingSoon = Boolean(item.comingSoon);
          return (
            <li key={item.title}>
              <button
                type="button"
                aria-current={item.isActive ? "page" : undefined}
                aria-disabled={isComingSoon}
                onClick={(event) => handleNavClick(event, isComingSoon)}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                  isComingSoon
                    ? "border-dashed border-zinc-200 text-zinc-400"
                    : "border-zinc-100 text-zinc-600 hover:border-zinc-200",
                )}
              >
                <span className="block text-base font-semibold text-zinc-900">{item.title}</span>
                <span className="text-xs text-zinc-500">{item.detail}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
