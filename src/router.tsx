import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { useGatewayStatusListener } from "@/hooks/use-gateway";
import Dashboard from "@/pages/dashboard";
import { Docker } from "@/pages/docker";
import { Install } from "@/pages/install";
import { Configure } from "@/pages/configure";
import { Monitor } from "@/pages/monitor";
import { Channels } from "@/pages/channels";
import { Settings } from "@/pages/settings";
import SetupWizard from "@/pages/setup-wizard";
import { OpenClawWebapp } from "@/pages/openclaw-webapp";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/docker" element={<Docker />} />
          <Route path="/install" element={<Install />} />
          <Route path="/configure" element={<Configure />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/webapp" element={<OpenClawWebapp />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export function AppRouter() {
  useGatewayStatusListener();

  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AppShell>
          <AnimatedRoutes />
        </AppShell>
      </HashRouter>
      <Toaster richColors position="bottom-right" />
    </QueryClientProvider>
  );
}
