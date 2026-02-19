import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";
import { getMotionDirectorProfile } from "@/lib/visuals/motionDirector";
import type { PlaceImageMood } from "@/lib/visuals/placeImageMotion";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
  mood?: PlaceImageMood;
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 18,
  duration,
  mood = "urban",
}: ScrollRevealProps) {
  const { reducedMotion } = useMotionPreference();
  const motionDirector = getMotionDirectorProfile(mood);
  const resolvedDuration = duration ?? motionDirector.revealDuration;

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: resolvedDuration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
