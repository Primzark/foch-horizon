import { useEffect, type PointerEvent, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { getPlaceParallaxPreset, type PlaceImageMood } from "@/lib/visuals/placeImageMotion";

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
  const intensityFactor = intensityMap[intensity];

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const scrollY = useMotionValue(0);
  const rotateZ = useMotionValue(0);

  const composedX = useTransform(() => pointerX.get());
  const composedY = useTransform(() => pointerY.get() + scrollY.get());

  const x = useSpring(composedX, {
    stiffness: parallaxPreset.springStiffness,
    damping: parallaxPreset.springDamping,
    mass: 0.32,
  });
  const y = useSpring(composedY, {
    stiffness: parallaxPreset.springStiffness,
    damping: parallaxPreset.springDamping,
    mass: 0.34,
  });
  const rotate = useSpring(rotateZ, {
    stiffness: parallaxPreset.springStiffness,
    damping: parallaxPreset.springDamping + 2,
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

    pointerX.set(normalizedX * parallaxPreset.pointerX * intensityFactor);
    pointerY.set(normalizedY * parallaxPreset.pointerY * intensityFactor);
    rotateZ.set(normalizedX * parallaxPreset.rotate * intensityFactor);
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
