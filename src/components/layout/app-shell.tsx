import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { SidebarNav } from "@/components/layout/sidebar-nav";

interface AppShellProps {
  children: ReactNode;
}

/**
 * App shell layout: sidebar (220px) left, header top, content right.
 * Per UI-SPEC.md: 24px content padding.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[13.75rem] shrink-0 border-r bg-card">
          <SidebarNav />
        </aside>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
