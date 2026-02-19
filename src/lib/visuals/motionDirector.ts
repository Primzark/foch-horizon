import type { PlaceImageMood } from "@/lib/visuals/placeImageMotion";

export interface MotionDirectorProfile {
  revealDuration: number;
  revealStagger: number;
  cardHoverLift: number;
  cardHoverScale: number;
  ctaSweepDuration: number;
  webglRippleStrength: number;
  webglWindStrength: number;
  particleDensity: number;
}

const motionDirectorProfiles: Record<PlaceImageMood, MotionDirectorProfile> = {
  coastal: {
    revealDuration: 0.4,
    revealStagger: 0.05,
    cardHoverLift: -5,
    cardHoverScale: 1.012,
    ctaSweepDuration: 6.2,
    webglRippleStrength: 1,
    webglWindStrength: 1,
    particleDensity: 1,
  },
  heritage: {
    revealDuration: 0.36,
    revealStagger: 0.045,
    cardHoverLift: -3.5,
    cardHoverScale: 1.008,
    ctaSweepDuration: 7.1,
    webglRippleStrength: 0.4,
    webglWindStrength: 0.46,
    particleDensity: 0.75,
  },
  urban: {
    revealDuration: 0.33,
    revealStagger: 0.04,
    cardHoverLift: -3,
    cardHoverScale: 1.006,
    ctaSweepDuration: 6.8,
    webglRippleStrength: 0.35,
    webglWindStrength: 0.42,
    particleDensity: 0.6,
  },
  residential: {
    revealDuration: 0.36,
    revealStagger: 0.045,
    cardHoverLift: -4,
    cardHoverScale: 1.009,
    ctaSweepDuration: 6.9,
    webglRippleStrength: 0.45,
    webglWindStrength: 0.58,
    particleDensity: 0.82,
  },
};

export function getMotionDirectorProfile(mood: PlaceImageMood): MotionDirectorProfile {
  return motionDirectorProfiles[mood];
}
