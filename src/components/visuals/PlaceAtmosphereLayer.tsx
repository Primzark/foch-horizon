import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PlaceImageMood } from "@/lib/visuals/placeImageMotion";
import { getMotionDirectorProfile } from "@/lib/visuals/motionDirector";
import { detectMotionQualityTier, getMotionQualityConfig } from "@/lib/visuals/motionQuality";

interface PlaceAtmosphereLayerProps {
  mood: PlaceImageMood;
  animated?: boolean;
  className?: string;
  variant?: "default" | "gallery";
}

const loopEase = { ease: "easeInOut" as const, repeat: Number.POSITIVE_INFINITY };

function CoastalAtmosphere({
  animated,
  neutralTone,
  durationScale,
}: {
  animated: boolean;
  neutralTone: boolean;
  durationScale: number;
}) {
  const seaLine = neutralTone ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.34)";

  return (
    <>
      <motion.div
        className="absolute inset-x-[-18%] bottom-[-10%] h-[36%] mix-blend-screen"
        style={{
          backgroundImage: `repeating-linear-gradient(106deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 22px, ${seaLine} 34px, rgba(255,255,255,0) 56px)`,
          clipPath: "ellipse(76% 56% at 50% 88%)",
          WebkitMaskImage: "radial-gradient(80% 64% at 50% 100%, rgba(0,0,0,1), rgba(0,0,0,0) 72%)",
          maskImage: "radial-gradient(80% 64% at 50% 100%, rgba(0,0,0,1), rgba(0,0,0,0) 72%)",
        }}
        animate={animated ? { x: [-64, 52, -38, -64], y: [0, -3, 2, 0], opacity: [0.22, 0.42, 0.28, 0.22] } : { opacity: 0.26 }}
        transition={animated ? { duration: 10.6 * durationScale, ...loopEase } : { duration: 0 }}
      />
      <motion.div
        className="absolute inset-x-[-24%] bottom-[-6%] h-[26%]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(98deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0.24) 18px, rgba(255,255,255,0) 42px)",
          mixBlendMode: "screen",
          clipPath: "ellipse(82% 62% at 50% 82%)",
        }}
        animate={animated ? { x: [40, -58, 30, 40], y: [0, 2, -2, 0], opacity: [0.08, 0.24, 0.1, 0.08] } : { opacity: 0.12 }}
        transition={animated ? { duration: 8.5 * durationScale, ...loopEase } : { duration: 0 }}
      />
      <motion.div
        className="absolute left-[-66%] top-[22%] h-[24%] w-[72%] blur-sm"
        style={{
          background:
            "linear-gradient(96deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 48%, rgba(255,255,255,0) 88%)",
          mixBlendMode: "screen",
        }}
        animate={animated ? { x: [0, 1220], opacity: [0, 0.48, 0] } : { opacity: 0.2 }}
        transition={animated ? { duration: 7.8 * durationScale, ease: "linear", repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
      />
      {!neutralTone && (
        <motion.div
          className="absolute -top-[22%] left-[-12%] h-[54%] w-[54%] rounded-full bg-white/18 blur-3xl"
          animate={animated ? { x: [0, 30, -12, 0], y: [0, -10, 8, 0], opacity: [0.14, 0.22, 0.14] } : { opacity: 0.14 }}
          transition={animated ? { duration: 14 * durationScale, ...loopEase } : { duration: 0 }}
        />
      )}
    </>
  );
}

function ResidentialAtmosphere({
  animated,
  neutralTone,
  durationScale,
}: {
  animated: boolean;
  neutralTone: boolean;
  durationScale: number;
}) {
  return (
    <>
      <motion.div
        className={cn(
          "absolute -left-[14%] bottom-[-26%] h-[74%] w-[42%] rounded-[46%] blur-2xl",
          neutralTone ? "bg-white/12" : "bg-emerald-200/26",
        )}
        animate={animated ? { x: [0, 14, -10, 0], y: [0, -8, 6, 0], rotate: [0, 2.2, -1.6, 0], opacity: [0.14, 0.24, 0.16, 0.14] } : { opacity: 0.14 }}
        transition={animated ? { duration: 7.4 * durationScale, ...loopEase } : { duration: 0 }}
      />
      <motion.div
        className={cn(
          "absolute right-[-10%] bottom-[-20%] h-[66%] w-[36%] rounded-[44%] blur-2xl",
          neutralTone ? "bg-white/10" : "bg-emerald-100/22",
        )}
        animate={animated ? { x: [0, -12, 8, 0], y: [0, -6, 4, 0], rotate: [0, -1.8, 1.2, 0], opacity: [0.12, 0.2, 0.14, 0.12] } : { opacity: 0.12 }}
        transition={animated ? { duration: 6.9 * durationScale, ...loopEase } : { duration: 0 }}
      />
      <motion.div
        className="absolute left-[-54%] top-[18%] h-[22%] w-[64%] blur-sm"
        style={{
          background:
            "linear-gradient(98deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 48%, rgba(255,255,255,0) 90%)",
        }}
        animate={animated ? { x: [0, 940], opacity: [0, 0.34, 0] } : { opacity: 0.12 }}
        transition={animated ? { duration: 10.2 * durationScale, ease: "linear", repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
      />
    </>
  );
}

function HeritageAtmosphere({
  animated,
  neutralTone,
  durationScale,
}: {
  animated: boolean;
  neutralTone: boolean;
  durationScale: number;
}) {
  return (
    <>
      <motion.div
        className={cn(
          "absolute -left-[16%] -top-[24%] h-[62%] w-[62%] rounded-full blur-3xl",
          neutralTone ? "bg-white/14" : "bg-amber-100/20",
        )}
        animate={animated ? { x: [0, 20, -8, 0], y: [0, -10, 6, 0], opacity: [0.14, 0.22, 0.16, 0.14] } : { opacity: 0.14 }}
        transition={animated ? { duration: 16.8 * durationScale, ...loopEase } : { duration: 0 }}
      />
      <motion.div
        className="absolute inset-y-0 left-[-40%] w-[48%] blur-sm"
        style={{
          background:
            "linear-gradient(108deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.42) 52%, rgba(255,255,255,0) 100%)",
        }}
        animate={animated ? { x: [0, 660], opacity: [0, 0.32, 0] } : { opacity: 0.12 }}
        transition={animated ? { duration: 11.8 * durationScale, ease: "linear", repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
      />
    </>
  );
}

function UrbanAtmosphere({
  animated,
  neutralTone,
  durationScale,
}: {
  animated: boolean;
  neutralTone: boolean;
  durationScale: number;
}) {
  return (
    <>
      <motion.div
        className={cn(
          "absolute -left-[24%] -top-[18%] h-[62%] w-[62%] rounded-full blur-3xl",
          neutralTone ? "bg-white/11" : "bg-zinc-100/14",
        )}
        animate={animated ? { x: [0, 16, -8, 0], y: [0, -7, 3, 0], opacity: [0.1, 0.2, 0.12, 0.1] } : { opacity: 0.1 }}
        transition={animated ? { duration: 13 * durationScale, ...loopEase } : { duration: 0 }}
      />
      <motion.div
        className="absolute inset-y-0 left-[-42%] w-[54%] blur-sm"
        style={{
          background:
            "linear-gradient(102deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.34) 52%, rgba(255,255,255,0) 100%)",
        }}
        animate={animated ? { x: [0, 760], opacity: [0, 0.28, 0] } : { opacity: 0.1 }}
        transition={animated ? { duration: 10.6 * durationScale, ease: "linear", repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
      />
    </>
  );
}

function AtmosphereParticles({ animated, count, durationScale }: { animated: boolean; count: number; durationScale: number }) {
  if (!animated || count < 1) {
    return null;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => {
        const progress = count === 1 ? 0.5 : index / (count - 1);
        const offsetX = 14 + progress * 72;
        const duration = (11 + index * 1.8) * durationScale;
        const delay = index * 0.75;

        return (
          <motion.span
            key={`particle-${index}`}
            className="absolute h-1 w-1 rounded-full bg-white/22 blur-[0.3px]"
            style={{ left: `${offsetX}%`, bottom: "-8%" }}
            animate={{ y: [-2, -66, -110], x: [0, index % 2 === 0 ? 8 : -7, 0], opacity: [0, 0.42, 0] }}
            transition={{ duration, delay, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
          />
        );
      })}
    </>
  );
}

export function PlaceAtmosphereLayer({ mood, animated = true, className, variant = "default" }: PlaceAtmosphereLayerProps) {
  const neutralTone = variant === "gallery";
  const motionDirector = useMemo(() => getMotionDirectorProfile(mood), [mood]);
  const qualityTier = useMemo(() => detectMotionQualityTier(), []);
  const qualityConfig = useMemo(() => getMotionQualityConfig(qualityTier), [qualityTier]);
  const qualityDensityFactor = qualityTier === "low" ? 0.62 : qualityTier === "medium" ? 0.82 : 1;
  const particleCount = Math.max(2, Math.round(5 * motionDirector.particleDensity * qualityDensityFactor));
  const durationScale = qualityTier === "low" ? 1.22 : qualityTier === "medium" ? 1.08 : 1;
  const animatedLayer = animated && qualityConfig.renderScale > 0.5;

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {mood === "coastal" && <CoastalAtmosphere animated={animatedLayer} neutralTone={neutralTone} durationScale={durationScale} />}
      {mood === "residential" && <ResidentialAtmosphere animated={animatedLayer} neutralTone={neutralTone} durationScale={durationScale} />}
      {mood === "heritage" && <HeritageAtmosphere animated={animatedLayer} neutralTone={neutralTone} durationScale={durationScale} />}
      {mood === "urban" && <UrbanAtmosphere animated={animatedLayer} neutralTone={neutralTone} durationScale={durationScale} />}
      {variant === "default" && (
        <AtmosphereParticles animated={animatedLayer} count={particleCount} durationScale={durationScale} />
      )}
    </div>
  );
}
