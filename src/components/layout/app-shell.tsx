import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useGatewayStore } from "@/stores/use-gateway-store";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { connected, connecting } = useGatewayStore();

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-[13.75rem] shrink-0 flex-col border-r bg-card">
          <div className="flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
          {/* Gateway connection indicator */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div
                className={`h-2 w-2 rounded-full ${
                  connected
                    ? "bg-green-500"
                    : connecting
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
                }`}
              />
              <span>
                {connected
                  ? "Gateway Connected"
                  : connecting
                  ? "Connecting..."
                  : "Gateway Disconnected"}
              </span>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
