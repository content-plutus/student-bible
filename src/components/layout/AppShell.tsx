import type { ReactNode } from "react";

import { PrimaryHeader } from "./PrimaryHeader";
import { ContextBar } from "./ContextBar";
import { NavigationRail } from "./NavigationRail";
import { InsightsPanel } from "./InsightsPanel";
import { FooterStatus } from "./FooterStatus";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-screen-2xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-10">
        <PrimaryHeader />
        <ContextBar className="mt-4" />
        <div className="mt-6 flex flex-1 flex-col gap-6 lg:grid lg:grid-cols-[220px,minmax(0,1fr)] xl:grid-cols-[220px,minmax(0,1fr),280px]">
          <nav aria-label="Workspace sections" className="order-last lg:order-none">
            <NavigationRail />
          </nav>
          <main className="min-h-0" role="main">
            {children}
          </main>
          <aside className="hidden xl:block" aria-label="Snapshot">
            <InsightsPanel />
          </aside>
        </div>
        <FooterStatus className="mt-6 lg:hidden" />
      </div>
    </div>
  );
}
