export type MotionQualityTier = "high" | "medium" | "low";

let cachedMotionQualityTier: MotionQualityTier | null = null;

function inferGpuTierFromRenderer(renderer: string): MotionQualityTier {
  const normalized = renderer.toLowerCase();

  if (/mali-4|adreno 5|intel\(r\) uhd graphics 6|swiftshader/.test(normalized)) {
    return "low";
  }

  if (/adreno 6|apple m1|apple m2|apple m3|rtx|radeon rx|arc a/.test(normalized)) {
    return "high";
  }

  return "medium";
}

function readRendererString(): string | null {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (!gl) return null;

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return null;

    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
  } catch {
    return null;
  }
}

export function detectMotionQualityTier(): MotionQualityTier {
  if (cachedMotionQualityTier) {
    return cachedMotionQualityTier;
  }

  if (typeof window === "undefined") {
    cachedMotionQualityTier = "medium";
    return cachedMotionQualityTier;
  }

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const isMobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);

  let tier: MotionQualityTier = "medium";

  if (cores <= 4 || memory <= 4 || isMobile) {
    tier = "low";
  }

  if (cores >= 8 && memory >= 8 && !isMobile) {
    tier = "high";
  }

  const renderer = readRendererString();
  if (renderer) {
    const gpuTier = inferGpuTierFromRenderer(renderer);
    if (gpuTier === "low") tier = "low";
    if (gpuTier === "high" && tier !== "low") tier = "high";
  }

  cachedMotionQualityTier = tier;
  return tier;
}

export interface MotionQualityConfig {
  dprCap: number;
  renderScale: number;
  pointerLerp: number;
  telemetrySampleFrames: number;
}

const qualityConfig: Record<MotionQualityTier, MotionQualityConfig> = {
  high: {
    dprCap: 2,
    renderScale: 1,
    pointerLerp: 0.08,
    telemetrySampleFrames: 180,
  },
  medium: {
    dprCap: 1.6,
    renderScale: 0.86,
    pointerLerp: 0.07,
    telemetrySampleFrames: 180,
  },
  low: {
    dprCap: 1.2,
    renderScale: 0.64,
    pointerLerp: 0.06,
    telemetrySampleFrames: 150,
  },
};

export function getMotionQualityConfig(tier: MotionQualityTier): MotionQualityConfig {
  return qualityConfig[tier];
}
