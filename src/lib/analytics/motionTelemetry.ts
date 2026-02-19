import { trackEvent } from "@/lib/analytics/events";
import type { MotionQualityTier } from "@/lib/visuals/motionQuality";
import type { PlaceImageMood } from "@/lib/visuals/placeImageMotion";

export interface MotionTelemetryInput {
  source: string;
  mood: PlaceImageMood;
  qualityTier: MotionQualityTier;
  averageFps: number;
  droppedFrameRatio: number;
  pointerLagMs: number;
}

export function trackMotionTelemetry(input: MotionTelemetryInput): void {
  trackEvent("motion_performance", {
    source: input.source,
    mood: input.mood,
    qualityTier: input.qualityTier,
    averageFps: Number(input.averageFps.toFixed(1)),
    droppedFrameRatio: Number(input.droppedFrameRatio.toFixed(3)),
    pointerLagMs: Number(input.pointerLagMs.toFixed(2)),
  });
}
