import { motion, AnimatePresence } from "motion/react";
import { useDockerLayerProgress } from "@/hooks/use-docker-layer-progress";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2, Download, HardDrive } from "lucide-react";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 20,
    },
  },
};

function getStatusIcon(description: string) {
  switch (description) {
    case "Done":
    case "Cached":
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case "Verifying":
      return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
    case "Extracting":
      return <HardDrive className="h-3 w-3 text-amber-500" />;
    case "Downloaded":
      return <CheckCircle2 className="h-3 w-3 text-green-400" />;
    default:
      return <Download className="h-3 w-3 text-primary" />;
  }
}

interface LayerProgressProps {
  className?: string;
}

export function LayerProgress({ className }: LayerProgressProps) {
  const { layers } = useDockerLayerProgress();

  const activeLayers = layers.filter(
    (l) => l.description !== "Done" && l.description !== "Cached"
  );
  const completedLayers = layers.filter(
    (l) => l.description === "Done" || l.description === "Cached"
  );

  if (layers.length === 0) {
    return null;
  }

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium">
          {completedLayers.length}/{layers.length} layers
        </span>
      </div>

      <AnimatePresence>
        {activeLayers.map((layer) => (
          <motion.div
            key={layer.id}
            variants={itemVariants}
            layout
            className="mb-2 flex items-center gap-2"
          >
            {getStatusIcon(layer.description)}
            <span className="w-20 shrink-0 truncate text-xs font-mono text-muted-foreground">
              {layer.id}
            </span>
            <Progress
              value={layer.layerPercentage}
              max={100}
              className="flex-1"
            />
            <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {layer.description === "Downloading"
                ? `${layer.layerPercentage}%`
                : layer.description}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {completedLayers.length > 0 && (
        <div className="mt-1 text-xs text-muted-foreground">
          <CheckCircle2 className="mr-1 inline h-3 w-3 text-green-500" />
          {completedLayers.length} layer{completedLayers.length > 1 ? "s" : ""}{" "}
          complete
        </div>
      )}
    </motion.div>
  );
}
