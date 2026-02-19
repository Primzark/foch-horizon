import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { getPlaceParallaxPreset, type PlaceImageMood } from "@/lib/visuals/placeImageMotion";
import { getMotionDirectorProfile } from "@/lib/visuals/motionDirector";
import { detectMotionQualityTier, getMotionQualityConfig, type MotionQualityTier } from "@/lib/visuals/motionQuality";
import { generateLivingPhotoMapsFromImage, resolveLivingPhotoAssetCandidate } from "@/lib/visuals/livingPhotoAssets";
import { trackMotionTelemetry } from "@/lib/analytics/motionTelemetry";

interface LivingPhotoWebGLProps {
  imageUrl: string;
  alt: string;
  mood: PlaceImageMood;
  depthMapUrl?: string;
  maskUrl?: string;
  fallbackImageUrl?: string;
  reducedMotion?: boolean;
  qualityTier?: MotionQualityTier;
  qualityBoost?: boolean;
  source?: string;
  className?: string;
}

const vertexShaderSource = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = (aPosition + 1.0) * 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;

varying vec2 vUv;

uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform sampler2D uMask;
uniform float uTime;
uniform vec2 uPointer;
uniform float uParallaxStrength;
uniform float uRippleStrength;
uniform float uWindStrength;
uniform float uUseDepth;
uniform float uUseMask;
uniform float uImageAspect;
uniform float uViewportAspect;

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec2 toCoverUv(vec2 uv, float imageAspect, float viewportAspect) {
  vec2 coverUv = uv;

  if (viewportAspect > imageAspect) {
    float scaleY = imageAspect / viewportAspect;
    coverUv.y = (uv.y - 0.5) * scaleY + 0.5;
  } else {
    float scaleX = viewportAspect / imageAspect;
    coverUv.x = (uv.x - 0.5) * scaleX + 0.5;
  }

  return coverUv;
}

void main() {
  vec2 uv = toCoverUv(vUv, max(uImageAspect, 0.001), max(uViewportAspect, 0.001));
  vec3 imageSample = texture2D(uImage, uv).rgb;

  float fallbackDepth = luminance(imageSample);
  float depthSample = texture2D(uDepth, uv).r;
  float depth = mix(fallbackDepth, depthSample, uUseDepth);
  float depthCentered = depth - 0.5;

  vec2 parallaxOffset = vec2(
    uPointer.x * (0.74 + depthCentered * 0.58),
    uPointer.y * (0.6 + depthCentered * 0.45)
  ) * uParallaxStrength;

  float maskSample = texture2D(uMask, uv).r;
  float fallbackMask = smoothstep(0.58, 0.95, uv.y);
  float motionMask = mix(fallbackMask, maskSample, uUseMask);

  float rippleA = sin((uv.x * 48.0) + (uTime * 0.58));
  float rippleB = sin((uv.y * 36.0) - (uTime * 0.37));
  float ripple = rippleA * rippleB * 0.0028 * uRippleStrength;

  float wind = sin((uv.y * 30.0) + (uTime * 0.44) + (uv.x * 8.0)) * 0.0016 * uWindStrength;
  vec2 cinematicOffset = vec2((ripple + wind) * motionMask, ripple * 0.4 * motionMask);

  vec2 sampledUv = clamp(uv + parallaxOffset + cinematicOffset, vec2(0.001), vec2(0.999));
  vec4 color = texture2D(uImage, sampledUv);

  float glint = smoothstep(0.0, 1.0, sin((uv.x * 10.0) + uTime * 0.21)) * motionMask * 0.03;
  color.rgb += vec3(glint);

  gl_FragColor = color;
}
`;

interface GlUniforms {
  image: WebGLUniformLocation | null;
  depth: WebGLUniformLocation | null;
  mask: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  pointer: WebGLUniformLocation | null;
  parallaxStrength: WebGLUniformLocation | null;
  rippleStrength: WebGLUniformLocation | null;
  windStrength: WebGLUniformLocation | null;
  useDepth: WebGLUniformLocation | null;
  useMask: WebGLUniformLocation | null;
  imageAspect: WebGLUniformLocation | null;
  viewportAspect: WebGLUniformLocation | null;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const generatedMapCache = new Map<string, { depthCanvas: HTMLCanvasElement; maskCanvas: HTMLCanvasElement }>();

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Unable to create shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader error";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error("Unable to create WebGL program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown program link error";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

function createSolidTexture(gl: WebGLRenderingContext, rgba: [number, number, number, number]): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Unable to create texture.");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array(rgba),
  );

  return texture;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached) {
    return cached;
  }

  const loadingPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    if (/^https?:\/\//.test(url)) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });

  imageCache.set(url, loadingPromise);
  return loadingPromise;
}

async function createTextureFromImage(gl: WebGLRenderingContext, image: HTMLImageElement): Promise<WebGLTexture> {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Unable to create texture.");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  return texture;
}

async function loadTexture(gl: WebGLRenderingContext, url: string): Promise<WebGLTexture> {
  const image = await loadImage(url);
  return await createTextureFromImage(gl, image);
}

function createTextureFromCanvas(gl: WebGLRenderingContext, canvas: HTMLCanvasElement): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Unable to create texture.");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

  return texture;
}

function bindTextureUnit(
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
  unit: number,
  uniformLocation: WebGLUniformLocation | null,
) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  if (uniformLocation) {
    gl.uniform1i(uniformLocation, unit);
  }
}

interface TelemetryState {
  frames: number;
  droppedFrames: number;
  fpsSum: number;
  pointerLagAccum: number;
  lastTimestamp: number;
  sent: boolean;
}

export function LivingPhotoWebGL({
  imageUrl,
  alt,
  mood,
  depthMapUrl,
  maskUrl,
  fallbackImageUrl,
  reducedMotion = false,
  qualityTier,
  qualityBoost = false,
  source = "home_hero",
  className,
}: LivingPhotoWebGLProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const telemetryRef = useRef<TelemetryState>({
    frames: 0,
    droppedFrames: 0,
    fpsSum: 0,
    pointerLagAccum: 0,
    lastTimestamp: 0,
    sent: false,
  });

  const [fallbackMode, setFallbackMode] = useState(false);
  const [surfaceReady, setSurfaceReady] = useState(reducedMotion);

  const parallaxPreset = useMemo(() => getPlaceParallaxPreset(mood), [mood]);
  const motionDirector = useMemo(() => getMotionDirectorProfile(mood), [mood]);
  const activeQualityTier = useMemo(() => qualityTier ?? detectMotionQualityTier(), [qualityTier]);
  const baseQualityConfig = useMemo(() => getMotionQualityConfig(activeQualityTier), [activeQualityTier]);
  const qualityConfig = useMemo(() => {
    if (!qualityBoost || activeQualityTier === "low") {
      return baseQualityConfig;
    }

    return {
      ...baseQualityConfig,
      dprCap: Math.min(baseQualityConfig.dprCap + (activeQualityTier === "high" ? 0.55 : 0.35), 2.6),
      renderScale: Math.min(baseQualityConfig.renderScale + (activeQualityTier === "high" ? 0.18 : 0.12), 1.2),
    };
  }, [activeQualityTier, baseQualityConfig, qualityBoost]);

  const resolvedAssetCandidate = useMemo(() => resolveLivingPhotoAssetCandidate(imageUrl), [imageUrl]);
  const effectiveDepthUrl = depthMapUrl ?? resolvedAssetCandidate.depthMapUrl;
  const effectiveMaskUrl = maskUrl ?? resolvedAssetCandidate.maskUrl;
  const effectiveFallbackUrl = fallbackImageUrl ?? resolvedAssetCandidate.fallbackImageUrl;
  const baseTextureSource = imageUrl;

  useEffect(() => {
    setSurfaceReady(reducedMotion);
  }, [baseTextureSource, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      setFallbackMode(true);
      setSurfaceReady(true);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setFallbackMode(true);
      setSurfaceReady(true);
      return;
    }

    const gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) {
      setFallbackMode(true);
      setSurfaceReady(true);
      return;
    }

    let isDisposed = false;
    let animationFrameId = 0;
    let observer: ResizeObserver | null = null;
    const cleanupFns: Array<() => void> = [];
    const pointerCurrent = { x: 0, y: 0 };
    let hasRenderedFirstFrame = false;

    telemetryRef.current = {
      frames: 0,
      droppedFrames: 0,
      fpsSum: 0,
      pointerLagAccum: 0,
      lastTimestamp: 0,
      sent: false,
    };

    const publishTelemetry = (force = false) => {
      const telemetry = telemetryRef.current;
      if (telemetry.sent || telemetry.frames < (force ? 60 : qualityConfig.telemetrySampleFrames)) {
        return;
      }

      telemetry.sent = true;
      const averageFps = telemetry.fpsSum / Math.max(1, telemetry.frames);
      const droppedFrameRatio = telemetry.droppedFrames / Math.max(1, telemetry.frames);
      const pointerLagMs = (telemetry.pointerLagAccum / Math.max(1, telemetry.frames)) * 16.67;

      trackMotionTelemetry({
        source,
        mood,
        qualityTier: activeQualityTier,
        averageFps,
        droppedFrameRatio,
        pointerLagMs,
      });
    };

    const setup = async () => {
      try {
        const program = createProgram(gl);
        gl.useProgram(program);

        const positionAttribute = gl.getAttribLocation(program, "aPosition");
        const uniforms: GlUniforms = {
          image: gl.getUniformLocation(program, "uImage"),
          depth: gl.getUniformLocation(program, "uDepth"),
          mask: gl.getUniformLocation(program, "uMask"),
          time: gl.getUniformLocation(program, "uTime"),
          pointer: gl.getUniformLocation(program, "uPointer"),
          parallaxStrength: gl.getUniformLocation(program, "uParallaxStrength"),
          rippleStrength: gl.getUniformLocation(program, "uRippleStrength"),
          windStrength: gl.getUniformLocation(program, "uWindStrength"),
          useDepth: gl.getUniformLocation(program, "uUseDepth"),
          useMask: gl.getUniformLocation(program, "uUseMask"),
          imageAspect: gl.getUniformLocation(program, "uImageAspect"),
          viewportAspect: gl.getUniformLocation(program, "uViewportAspect"),
        };

        const quadBuffer = gl.createBuffer();
        if (!quadBuffer) {
          throw new Error("Unable to create quad buffer.");
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(positionAttribute);
        gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

        const baseImage = await loadImage(baseTextureSource);
        const imageAspect =
          (baseImage.naturalWidth || baseImage.width || 1) / Math.max(baseImage.naturalHeight || baseImage.height || 1, 1);
        const imageTexture = await createTextureFromImage(gl, baseImage);

        let generatedMaps = generatedMapCache.get(`${baseTextureSource}|${mood}|${activeQualityTier}`);
        if (!generatedMaps && (!effectiveDepthUrl || !effectiveMaskUrl)) {
          generatedMaps = generateLivingPhotoMapsFromImage(baseImage, mood, activeQualityTier);
          generatedMapCache.set(`${baseTextureSource}|${mood}|${activeQualityTier}`, generatedMaps);
        }

        let depthTexture: WebGLTexture | null = null;
        let maskTexture: WebGLTexture | null = null;

        if (effectiveDepthUrl) {
          try {
            depthTexture = await loadTexture(gl, effectiveDepthUrl);
          } catch {
            depthTexture = null;
          }
        }

        if (effectiveMaskUrl) {
          try {
            maskTexture = await loadTexture(gl, effectiveMaskUrl);
          } catch {
            maskTexture = null;
          }
        }

        if (!depthTexture && generatedMaps) {
          depthTexture = createTextureFromCanvas(gl, generatedMaps.depthCanvas);
        }

        if (!maskTexture && generatedMaps) {
          maskTexture = createTextureFromCanvas(gl, generatedMaps.maskCanvas);
        }

        const hasDepthMap = Boolean(depthTexture);
        const hasMaskMap = Boolean(maskTexture);

        depthTexture ??= createSolidTexture(gl, [128, 128, 128, 255]);
        maskTexture ??= createSolidTexture(gl, [255, 255, 255, 255]);

        bindTextureUnit(gl, imageTexture, 0, uniforms.image);
        bindTextureUnit(gl, depthTexture, 1, uniforms.depth);
        bindTextureUnit(gl, maskTexture, 2, uniforms.mask);

        gl.uniform1f(uniforms.useDepth, hasDepthMap ? 1 : 0);
        gl.uniform1f(uniforms.useMask, hasMaskMap ? 1 : 0);
        gl.uniform1f(uniforms.imageAspect, imageAspect);
        gl.uniform1f(uniforms.parallaxStrength, parallaxPreset.pointerX * 0.00084 * (activeQualityTier === "low" ? 0.86 : 1));
        gl.uniform1f(uniforms.rippleStrength, motionDirector.webglRippleStrength * (activeQualityTier === "low" ? 0.8 : 1));
        gl.uniform1f(uniforms.windStrength, motionDirector.webglWindStrength * (activeQualityTier === "low" ? 0.8 : 1));

        const resize = () => {
          const dpr = Math.min(window.devicePixelRatio || 1, qualityConfig.dprCap);
          const width = Math.max(1, Math.floor(canvas.clientWidth * dpr * qualityConfig.renderScale));
          const height = Math.max(1, Math.floor(canvas.clientHeight * dpr * qualityConfig.renderScale));
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.uniform1f(uniforms.viewportAspect, canvas.width / Math.max(canvas.height, 1));
        };

        resize();
        window.addEventListener("resize", resize, { passive: true });
        cleanupFns.push(() => window.removeEventListener("resize", resize));

        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(resize);
          observer.observe(canvas);
        }

        const render = (timestamp: number) => {
          if (isDisposed) {
            return;
          }

          pointerCurrent.x += (pointerTargetRef.current.x - pointerCurrent.x) * qualityConfig.pointerLerp;
          pointerCurrent.y += (pointerTargetRef.current.y - pointerCurrent.y) * qualityConfig.pointerLerp;

          const telemetry = telemetryRef.current;
          if (telemetry.lastTimestamp > 0) {
            const delta = timestamp - telemetry.lastTimestamp;
            if (delta > 0) {
              telemetry.frames += 1;
              telemetry.fpsSum += 1000 / delta;
              if (delta > 34) {
                telemetry.droppedFrames += 1;
              }

              telemetry.pointerLagAccum += Math.hypot(
                pointerTargetRef.current.x - pointerCurrent.x,
                pointerTargetRef.current.y - pointerCurrent.y,
              );

              publishTelemetry();
            }
          }
          telemetry.lastTimestamp = timestamp;

          gl.uniform1f(uniforms.time, timestamp * 0.001);
          gl.uniform2f(uniforms.pointer, pointerCurrent.x, pointerCurrent.y);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          if (!hasRenderedFirstFrame && !isDisposed) {
            hasRenderedFirstFrame = true;
            setSurfaceReady(true);
          }

          animationFrameId = window.requestAnimationFrame(render);
        };

        setFallbackMode(false);
        animationFrameId = window.requestAnimationFrame(render);

        cleanupFns.push(() => {
          publishTelemetry(true);
          gl.deleteTexture(imageTexture);
          gl.deleteTexture(depthTexture);
          gl.deleteTexture(maskTexture);
          gl.deleteBuffer(quadBuffer);
          gl.deleteProgram(program);
        });
      } catch {
        if (!isDisposed) {
          setFallbackMode(true);
          setSurfaceReady(true);
        }
      }
    };

    setup();

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrameId);
      observer?.disconnect();
      cleanupFns.forEach((cleanup) => cleanup());
    };
  }, [
    activeQualityTier,
    baseTextureSource,
    effectiveDepthUrl,
    effectiveMaskUrl,
    mood,
    motionDirector.webglRippleStrength,
    motionDirector.webglWindStrength,
    parallaxPreset.pointerX,
    qualityConfig.dprCap,
    qualityConfig.pointerLerp,
    qualityConfig.renderScale,
    qualityConfig.telemetrySampleFrames,
    qualityBoost,
    reducedMotion,
    source,
  ]);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || fallbackMode || event.pointerType === "touch") {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    pointerTargetRef.current.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    pointerTargetRef.current.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -2;
  };

  const resetPointer = () => {
    pointerTargetRef.current.x = 0;
    pointerTargetRef.current.y = 0;
  };

  if (fallbackMode || reducedMotion) {
    return (
      <img
        src={baseTextureSource}
        alt={alt}
        className={cn("h-full w-full object-cover", className)}
        loading="eager"
        decoding="async"
        onError={(event) => {
          if (effectiveFallbackUrl && event.currentTarget.src !== new URL(effectiveFallbackUrl, window.location.href).href) {
            event.currentTarget.src = effectiveFallbackUrl;
          }
        }}
      />
    );
  }

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      role="img"
      aria-label={alt}
      onPointerMove={onPointerMove}
      onPointerLeave={resetPointer}
      onPointerCancel={resetPointer}
    >
      {!surfaceReady && (
        <img
          src={baseTextureSource}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          loading="eager"
          decoding="async"
          onError={(event) => {
            if (effectiveFallbackUrl && event.currentTarget.src !== new URL(effectiveFallbackUrl, window.location.href).href) {
              event.currentTarget.src = effectiveFallbackUrl;
            }
          }}
        />
      )}
      <canvas ref={canvasRef} className={cn("h-full w-full transition-opacity duration-500", surfaceReady ? "opacity-100" : "opacity-0")} />
    </div>
  );
}
