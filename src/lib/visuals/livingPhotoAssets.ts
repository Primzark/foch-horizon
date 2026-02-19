import type { PlaceImageMood } from "@/lib/visuals/placeImageMotion";
import type { MotionQualityTier } from "@/lib/visuals/motionQuality";

export interface LivingPhotoAssetCandidate {
  depthMapUrl?: string;
  maskUrl?: string;
  fallbackImageUrl?: string;
}

const knownAssetCandidates: Array<{
  pattern: RegExp;
  candidate: LivingPhotoAssetCandidate;
}> = [
  {
    pattern: /panorama-le-havre|foch\.staticlbi\.com\/original\/images\/header\/1\.jpg/i,
    candidate: {
      depthMapUrl: "/images/motion/hero-depth-map.svg",
      maskUrl: "/images/motion/sea-mask.svg",
      fallbackImageUrl: "/images/le-havre-history/panorama-le-havre.jpg",
    },
  },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) {
    return x < edge0 ? 0 : 1;
  }

  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function createWorkingCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function resolveTargetWidth(tier: MotionQualityTier): number {
  if (tier === "low") return 320;
  if (tier === "medium") return 420;
  return 560;
}

function buildDepthCanvas(
  imageData: ImageData,
  width: number,
  height: number,
  mood: PlaceImageMood,
): HTMLCanvasElement {
  const canvas = createWorkingCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const source = imageData.data;
  const depthData = context.createImageData(width, height);
  const target = depthData.data;
  const luminance = new Float32Array(width * height);
  const saturation = new Float32Array(width * height);

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const r = source[offset] / 255;
    const g = source[offset + 1] / 255;
    const b = source[offset + 2] / 255;

    const maxValue = Math.max(r, g, b);
    const minValue = Math.min(r, g, b);
    luminance[index] = 0.299 * r + 0.587 * g + 0.114 * b;
    saturation[index] = maxValue === 0 ? 0 : (maxValue - minValue) / maxValue;
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;

      const lum = luminance[index];
      const sat = saturation[index];
      const yNorm = y / Math.max(1, height - 1);
      const xNorm = x / Math.max(1, width - 1);

      const left = x > 0 ? luminance[index - 1] : lum;
      const top = y > 0 ? luminance[index - width] : lum;
      const edge = clamp01(Math.abs(lum - left) + Math.abs(lum - top));

      let depth = 0.2 + yNorm * 0.52 + lum * 0.18 + edge * 0.2 + sat * 0.08;

      if (mood === "coastal") {
        depth += yNorm * 0.16 + smoothstep(0.45, 1, yNorm) * 0.08;
      } else if (mood === "residential") {
        depth += yNorm * 0.13 + sat * 0.08;
      } else if (mood === "heritage") {
        const centerBand = 1 - Math.abs(yNorm - 0.56) * 1.5;
        depth += centerBand * 0.1;
      } else {
        depth += yNorm * 0.09 + smoothstep(0.4, 0.9, xNorm) * 0.03;
      }

      const depthByte = Math.round(clamp01(depth) * 255);
      target[offset] = depthByte;
      target[offset + 1] = depthByte;
      target[offset + 2] = depthByte;
      target[offset + 3] = 255;
    }
  }

  context.putImageData(depthData, 0, 0);
  return canvas;
}

function buildSemanticMaskCanvas(
  imageData: ImageData,
  width: number,
  height: number,
  mood: PlaceImageMood,
): HTMLCanvasElement {
  const canvas = createWorkingCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const source = imageData.data;
  const maskData = context.createImageData(width, height);
  const target = maskData.data;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;

      const r = source[offset] / 255;
      const g = source[offset + 1] / 255;
      const b = source[offset + 2] / 255;
      const maxValue = Math.max(r, g, b);
      const minValue = Math.min(r, g, b);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = maxValue === 0 ? 0 : (maxValue - minValue) / maxValue;
      const yNorm = y / Math.max(1, height - 1);

      const isSeaTone = b > g * 0.98 && b > r * 1.08;
      const isFoliage = g > r * 1.06 && g > b * 1.03;
      const isBrightNeutral = lum > 0.64 && sat < 0.24;

      let maskValue = 0;

      if (mood === "coastal") {
        maskValue =
          (isSeaTone ? 0.64 : 0) +
          (isBrightNeutral ? 0.2 : 0) +
          smoothstep(0.52, 1, yNorm) * 0.3;
      } else if (mood === "residential") {
        maskValue =
          (isFoliage ? 0.72 : 0) +
          (isBrightNeutral ? 0.12 : 0) +
          smoothstep(0.42, 1, yNorm) * 0.2;
      } else if (mood === "heritage") {
        maskValue =
          (isBrightNeutral ? 0.46 : 0) +
          smoothstep(0.56, 1, yNorm) * 0.24;
      } else {
        maskValue =
          (isBrightNeutral ? 0.4 : 0) +
          smoothstep(0.6, 1, yNorm) * 0.22;
      }

      const maskByte = Math.round(clamp01(maskValue) * 255);
      target[offset] = maskByte;
      target[offset + 1] = maskByte;
      target[offset + 2] = maskByte;
      target[offset + 3] = 255;
    }
  }

  context.putImageData(maskData, 0, 0);
  return canvas;
}

export function resolveLivingPhotoAssetCandidate(imageUrl: string): LivingPhotoAssetCandidate {
  const candidate = knownAssetCandidates.find((entry) => entry.pattern.test(imageUrl));
  return candidate?.candidate ?? {};
}

export function generateLivingPhotoMapsFromImage(
  image: HTMLImageElement,
  mood: PlaceImageMood,
  qualityTier: MotionQualityTier,
): { depthCanvas: HTMLCanvasElement; maskCanvas: HTMLCanvasElement } {
  const targetWidth = resolveTargetWidth(qualityTier);
  const aspectRatio = image.height / Math.max(1, image.width);
  const targetHeight = Math.max(1, Math.round(targetWidth * aspectRatio));

  const sourceCanvas = createWorkingCanvas(targetWidth, targetHeight);
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    return {
      depthCanvas: createWorkingCanvas(1, 1),
      maskCanvas: createWorkingCanvas(1, 1),
    };
  }

  sourceContext.drawImage(image, 0, 0, targetWidth, targetHeight);
  const imageData = sourceContext.getImageData(0, 0, targetWidth, targetHeight);

  return {
    depthCanvas: buildDepthCanvas(imageData, targetWidth, targetHeight, mood),
    maskCanvas: buildSemanticMaskCanvas(imageData, targetWidth, targetHeight, mood),
  };
}
