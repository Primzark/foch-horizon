import { useEffect, useMemo, type PointerEvent, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { getPlaceParallaxPreset, type PlaceImageMood } from "@/lib/visuals/placeImageMotion";
import { getMotionDirectorProfile } from "@/lib/visuals/motionDirector";
import { detectMotionQualityTier, getMotionQualityConfig } from "@/lib/visuals/motionQuality";

interface ContextAwareParallaxProps {
  mood: PlaceImageMood;
  children: ReactNode;
  className?: string;
  reducedMotion?: boolean;
  scrollReactive?: boolean;
  intensity?: "subtle" | "balanced" | "immersive";
}

const intensityMap = {
  subtle: 0.72,
  balanced: 1,
  immersive: 1.28,
} as const;

export function ContextAwareParallax({
  mood,
  children,
  className,
  reducedMotion = false,
  scrollReactive = false,
  intensity = "balanced",
}: ContextAwareParallaxProps) {
  const parallaxPreset = getPlaceParallaxPreset(mood);
  const motionDirector = getMotionDirectorProfile(mood);
  const qualityTier = useMemo(() => detectMotionQualityTier(), []);
  const qualityConfig = useMemo(() => getMotionQualityConfig(qualityTier), [qualityTier]);
  const qualityIntensityFactor = qualityTier === "low" ? 0.72 : qualityTier === "medium" ? 0.88 : 1;
  const moodIntensityFactor = 0.92 + motionDirector.particleDensity * 0.08;
  const intensityFactor = intensityMap[intensity] * qualityIntensityFactor * moodIntensityFactor;
  const pointerScale = Math.min(1, qualityConfig.renderScale + 0.22);
  const springStiffness = parallaxPreset.springStiffness * (qualityTier === "low" ? 0.88 : qualityTier === "medium" ? 0.94 : 1);
  const springDamping = parallaxPreset.springDamping + (qualityTier === "low" ? 3 : qualityTier === "medium" ? 2 : 0);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const scrollY = useMotionValue(0);
  const rotateZ = useMotionValue(0);

  const composedX = useTransform(() => pointerX.get());
  const composedY = useTransform(() => pointerY.get() + scrollY.get());

  const x = useSpring(composedX, {
    stiffness: springStiffness,
    damping: springDamping,
    mass: 0.32,
  });
  const y = useSpring(composedY, {
    stiffness: springStiffness,
    damping: springDamping,
    mass: 0.34,
  });
  const rotate = useSpring(rotateZ, {
    stiffness: springStiffness,
    damping: springDamping + 2,
    mass: 0.4,
  });

  useEffect(() => {
    if (reducedMotion || !scrollReactive || typeof window === "undefined") {
      scrollY.set(0);
      return;
    }

    const updateDrift = () => {
      const drift =
        Math.sin(window.scrollY / parallaxPreset.scrollCycle + parallaxPreset.scrollPhase) *
        parallaxPreset.scrollDrift *
        intensityFactor;
      scrollY.set(drift);
    };

    updateDrift();
    window.addEventListener("scroll", updateDrift, { passive: true });

    return () => window.removeEventListener("scroll", updateDrift);
  }, [
    intensityFactor,
    parallaxPreset.scrollCycle,
    parallaxPreset.scrollDrift,
    parallaxPreset.scrollPhase,
    reducedMotion,
    scrollReactive,
    scrollY,
  ]);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType === "touch") {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    const normalizedX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const normalizedY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    pointerX.set(normalizedX * parallaxPreset.pointerX * intensityFactor * pointerScale);
    pointerY.set(normalizedY * parallaxPreset.pointerY * intensityFactor * pointerScale);
    rotateZ.set(normalizedX * parallaxPreset.rotate * intensityFactor * pointerScale);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
    rotateZ.set(0);
  };

  return (
    <motion.div
      className={cn("h-full w-full will-change-transform", className)}
      style={reducedMotion ? undefined : { x, y, rotateZ: rotate }}
      onPointerMove={onPointerMove}
      onPointerLeave={resetPointer}
      onPointerCancel={resetPointer}
    >
      {children}
    </motion.div>
  );
}
