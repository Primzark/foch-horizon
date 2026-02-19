import { motion } from "framer-motion";
import type { PlaceImageMood } from "@/lib/visuals/placeImageMotion";
import { cn } from "@/lib/utils";

interface HeroCinemagraphProps {
  mood: PlaceImageMood;
  animated?: boolean;
  className?: string;
}

export function HeroCinemagraph({ mood, animated = true, className }: HeroCinemagraphProps) {
  if (mood !== "coastal") {
    return null;
  }

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <motion.div
        className="absolute inset-x-[-22%] bottom-[-10%] h-[36%] mix-blend-screen"
        style={{
          backgroundImage:
            "repeating-linear-gradient(108deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0.2) 18px, rgba(255,255,255,0) 42px)",
          WebkitMaskImage: "radial-gradient(78% 62% at 50% 100%, rgba(0,0,0,1), rgba(0,0,0,0) 72%)",
          maskImage: "radial-gradient(78% 62% at 50% 100%, rgba(0,0,0,1), rgba(0,0,0,0) 72%)",
        }}
        animate={animated ? { x: [-70, 58, -44, -70], y: [0, -3, 2, 0], opacity: [0.14, 0.28, 0.18, 0.14] } : { opacity: 0.14 }}
        transition={animated ? { duration: 11.5, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
      />
      <motion.div
        className="absolute left-[-58%] top-[42%] h-[18%] w-[66%] blur-sm"
        style={{
          background:
            "linear-gradient(94deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.48) 50%, rgba(255,255,255,0) 92%)",
          mixBlendMode: "screen",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
        }}
        animate={animated ? { x: [0, 1240], opacity: [0, 0.5, 0] } : { opacity: 0.2 }}
        transition={animated ? { duration: 8.4, ease: "linear", repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
      />
    </div>
  );
}
