import { motion } from "motion/react";
import { Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/stores/use-wizard-store";

export function WelcomeStep() {
  const nextStep = useWizardStore((s) => s.nextStep);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center gap-6 py-12 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Rocket className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to ClawStation
        </h1>
        <p className="mx-auto max-w-md text-muted-foreground">
          Let's set up your AI assistant. We'll configure your model provider,
          API keys, sandbox settings, and messaging channels — all before
          installation starts.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Choose your AI model provider</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Configure sandbox security</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Connect messaging channels</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Install and start OpenClaw</span>
        </div>
      </div>
      <Button onClick={nextStep} size="lg" className="mt-4 gap-2">
        Get Started
        <ArrowRight className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
