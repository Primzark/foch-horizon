import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { getPlaceParallaxPreset, type PlaceImageMood } from "@/lib/visuals/placeImageMotion";

interface LivingPhotoWebGLProps {
  imageUrl: string;
  alt: string;
  mood: PlaceImageMood;
  depthMapUrl?: string;
  maskUrl?: string;
  fallbackImageUrl?: string;
  reducedMotion?: boolean;
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

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 uv = vUv;
  vec3 imageSample = texture2D(uImage, uv).rgb;

  float fallbackDepth = luminance(imageSample);
  float depthSample = texture2D(uDepth, uv).r;
  float depth = mix(fallbackDepth, depthSample, uUseDepth);
  float depthCentered = depth - 0.5;

  vec2 parallaxOffset = vec2(
    uPointer.x * (0.75 + depthCentered * 0.55),
    uPointer.y * (0.62 + depthCentered * 0.42)
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

  float glint = smoothstep(0.0, 1.0, sin((uv.x * 10.0) + uTime * 0.21)) * motionMask * 0.035;
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
}

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

async function loadImage(url: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    if (/^https?:\/\//.test(url)) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

async function loadTexture(gl: WebGLRenderingContext, url: string): Promise<WebGLTexture> {
  const image = await loadImage(url);
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

function resolveTextureSource(primary: string, fallback?: string): string {
  if (!fallback || typeof window === "undefined") {
    return primary;
  }

  try {
    const primaryUrl = new URL(primary, window.location.href);
    if (primaryUrl.origin !== window.location.origin) {
      return fallback;
    }
  } catch {
    return primary;
  }

  return primary;
}

export function LivingPhotoWebGL({
  imageUrl,
  alt,
  mood,
  depthMapUrl,
  maskUrl,
  fallbackImageUrl,
  reducedMotion = false,
  className,
}: LivingPhotoWebGLProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const [fallbackMode, setFallbackMode] = useState(false);
  const parallaxPreset = useMemo(() => getPlaceParallaxPreset(mood), [mood]);

  const baseTextureSource = useMemo(
    () => resolveTextureSource(imageUrl, fallbackImageUrl),
    [fallbackImageUrl, imageUrl],
  );

  useEffect(() => {
    if (reducedMotion) {
      setFallbackMode(true);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setFallbackMode(true);
      return;
    }

    const gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) {
      setFallbackMode(true);
      return;
    }

    let isDisposed = false;
    let animationFrameId = 0;
    let observer: ResizeObserver | null = null;
    const cleanupFns: Array<() => void> = [];

    const pointerCurrent = { x: 0, y: 0 };

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
        };

        const quadBuffer = gl.createBuffer();
        if (!quadBuffer) {
          throw new Error("Unable to create quad buffer.");
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
          gl.STATIC_DRAW,
        );

        gl.enableVertexAttribArray(positionAttribute);
        gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

        const imageTexture = await loadTexture(gl, baseTextureSource);
        const depthTexture = depthMapUrl ? await loadTexture(gl, depthMapUrl) : createSolidTexture(gl, [128, 128, 128, 255]);
        const maskTexture = maskUrl ? await loadTexture(gl, maskUrl) : createSolidTexture(gl, [255, 255, 255, 255]);

        bindTextureUnit(gl, imageTexture, 0, uniforms.image);
        bindTextureUnit(gl, depthTexture, 1, uniforms.depth);
        bindTextureUnit(gl, maskTexture, 2, uniforms.mask);

        gl.uniform1f(uniforms.useDepth, depthMapUrl ? 1 : 0);
        gl.uniform1f(uniforms.useMask, maskUrl ? 1 : 0);
        gl.uniform1f(uniforms.parallaxStrength, parallaxPreset.pointerX * 0.00084);
        gl.uniform1f(uniforms.rippleStrength, mood === "coastal" ? 1 : 0.38);
        gl.uniform1f(uniforms.windStrength, mood === "coastal" ? 1 : 0.42);

        const resize = () => {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
          const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
          gl.viewport(0, 0, canvas.width, canvas.height);
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

          pointerCurrent.x += (pointerTargetRef.current.x - pointerCurrent.x) * 0.07;
          pointerCurrent.y += (pointerTargetRef.current.y - pointerCurrent.y) * 0.07;

          gl.uniform1f(uniforms.time, timestamp * 0.001);
          gl.uniform2f(uniforms.pointer, pointerCurrent.x, pointerCurrent.y);

          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          animationFrameId = window.requestAnimationFrame(render);
        };

        setFallbackMode(false);
        animationFrameId = window.requestAnimationFrame(render);

        cleanupFns.push(() => {
          gl.deleteTexture(imageTexture);
          gl.deleteTexture(depthTexture);
          gl.deleteTexture(maskTexture);
          gl.deleteBuffer(quadBuffer);
          gl.deleteProgram(program);
        });
      } catch {
        if (!isDisposed) {
          setFallbackMode(true);
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
  }, [baseTextureSource, depthMapUrl, fallbackImageUrl, maskUrl, mood, parallaxPreset.pointerX, reducedMotion]);

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
      />
    );
  }

  return (
    <div
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={alt}
      onPointerMove={onPointerMove}
      onPointerLeave={resetPointer}
      onPointerCancel={resetPointer}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
