import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PlaceImageMood } from "@/lib/visuals/placeImageMotion";

interface PlaceAtmosphereLayerProps {
  mood: PlaceImageMood;
  animated?: boolean;
  className?: string;
}

const loopEase = { ease: "easeInOut" as const, repeat: Number.POSITIVE_INFINITY };

export function PlaceAtmosphereLayer({ mood, animated = true, className }: PlaceAtmosphereLayerProps) {
  if (mood === "coastal") {
    return (
      <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
        <motion.div
          className="absolute inset-x-[-28%] bottom-[-18%] h-[50%] mix-blend-screen"
          style={{
            backgroundImage:
              "repeating-linear-gradient(110deg, rgba(56,189,248,0) 0px, rgba(56,189,248,0) 26px, rgba(125,211,252,0.26) 40px, rgba(56,189,248,0) 64px)",
          }}
          animate={
            animated
              ? { x: [-90, 70, -50, -90], y: [0, -4, 2, 0], opacity: [0.2, 0.34, 0.24, 0.2] }
              : { opacity: 0.24 }
          }
          transition={animated ? { duration: 14, ...loopEase } : { duration: 0 }}
        />
        <motion.div
          className="absolute left-[-62%] top-[38%] h-[28%] w-[66%] blur-md"
          style={{
            background:
              "linear-gradient(96deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.42) 46%, rgba(255,255,255,0) 86%)",
            mixBlendMode: "screen",
          }}
          animate={animated ? { x: [0, 1080], opacity: [0, 0.5, 0] } : { opacity: 0.2 }}
          transition={animated ? { duration: 9.8, ease: "linear", repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
        />
        <motion.div
          className="absolute -top-[24%] left-[-16%] h-[58%] w-[58%] rounded-full bg-sky-100/18 blur-3xl"
          animate={animated ? { x: [0, 36, -10, 0], y: [0, -12, 8, 0], opacity: [0.16, 0.26, 0.18, 0.16] } : { opacity: 0.18 }}
          transition={animated ? { duration: 16, ...loopEase } : { duration: 0 }}
        />
      </div>
    );
  }

  if (mood === "heritage") {
    return (
      <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
        <motion.div
          className="absolute -left-[20%] -top-[28%] h-[70%] w-[70%] rounded-full bg-amber-100/18 blur-3xl"
          animate={animated ? { x: [0, 22, -8, 0], y: [0, -8, 6, 0], opacity: [0.14, 0.24, 0.16, 0.14] } : { opacity: 0.15 }}
          transition={animated ? { duration: 17.5, ...loopEase } : { duration: 0 }}
        />
        <motion.div
          className="absolute inset-y-0 left-[-36%] w-[46%] blur-sm"
          style={{
            background:
              "linear-gradient(112deg, rgba(255,255,255,0) 0%, rgba(254,215,170,0.28) 50%, rgba(255,255,255,0) 100%)",
          }}
          animate={animated ? { x: [0, 640], opacity: [0, 0.35, 0] } : { opacity: 0.14 }}
          transition={animated ? { duration: 13.5, ease: "linear", repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
        />
      </div>
    );
  }

  if (mood === "residential") {
    return (
      <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
        <motion.div
          className="absolute -left-[30%] top-[18%] h-[56%] w-[72%] rounded-full bg-emerald-100/16 blur-3xl"
          animate={animated ? { x: [0, 28, -14, 0], y: [0, -6, 5, 0], opacity: [0.14, 0.22, 0.14] } : { opacity: 0.15 }}
          transition={animated ? { duration: 15, ...loopEase } : { duration: 0 }}
        />
        <motion.div
          className="absolute right-[-14%] top-[-16%] h-[46%] w-[44%] rounded-full bg-emerald-50/14 blur-2xl"
          animate={animated ? { x: [0, -16, 8, 0], y: [0, 10, -4, 0], opacity: [0.12, 0.2, 0.12] } : { opacity: 0.12 }}
          transition={animated ? { duration: 14.5, ...loopEase } : { duration: 0 }}
        />
      </div>
    );
  }

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <motion.div
        className="absolute -left-[24%] -top-[20%] h-[64%] w-[64%] rounded-full bg-slate-100/14 blur-3xl"
        animate={animated ? { x: [0, 18, -8, 0], y: [0, -8, 4, 0], opacity: [0.1, 0.2, 0.12, 0.1] } : { opacity: 0.12 }}
        transition={animated ? { duration: 13.5, ...loopEase } : { duration: 0 }}
      />
      <motion.div
        className="absolute inset-y-0 left-[-42%] w-[54%] blur-sm"
        style={{
          background: "linear-gradient(102deg, rgba(255,255,255,0) 0%, rgba(191,219,254,0.25) 52%, rgba(255,255,255,0) 100%)",
        }}
        animate={animated ? { x: [0, 720], opacity: [0, 0.32, 0] } : { opacity: 0.1 }}
        transition={animated ? { duration: 12.5, ease: "linear", repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
      />
    </div>
  );
}
