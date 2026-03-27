import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Container,
  Download,
  Settings2,
  Activity,
  MessageSquare,
  Cog,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/docker", label: "Docker", icon: Container },
  { to: "/install", label: "Install", icon: Download },
  { to: "/channels", label: "Channels", icon: MessageSquare },
  { to: "/configure", label: "Configure", icon: Settings2 },
  { to: "/monitor", label: "Monitor", icon: Activity },
  { to: "/settings", label: "Settings", icon: Cog },
];

/**
 * Sidebar navigation with 7 items using Lucide icons.
 * Active state: red primary left border (3px) + red accent background.
 */
export function SidebarNav() {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? "border-l-[3px] border-primary bg-primary/10 font-medium text-primary"
                : "border-l-[3px] border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
            }`
          }
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
