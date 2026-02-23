import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Compass, Handshake, Search } from "lucide-react";
import { GoogleGIcon } from "@/components/branding/GoogleGIcon";
import { Button } from "@/components/ui/button";
import { getFeaturedProperties } from "@/features/listings/api/properties.service";
import { ListingCard } from "@/features/listings/components/ListingCard";
import { agents } from "@/features/listings/data/agents";
import { toSearchItem } from "@/features/listings/utils/mappers";
import { cities } from "@/features/cities/data/cities";
import { useUiStore } from "@/lib/state/useUiStore";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";
import { MarketCounters } from "@/features/content/components/MarketCounters";
import { getAgencyReviews } from "@/features/content/api/googleReviews.service";
import { inferPlaceImageMood } from "@/lib/visuals/placeImageMotion";
import { ScrollReveal } from "@/components/visuals/ScrollReveal";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";
import { getMotionDirectorProfile } from "@/lib/visuals/motionDirector";
import { heroScenicImages } from "@/features/content/data/heroScenicImages";

const serviceCards = [
  {
    title: "Estimation",
    description: "Une estimation précise, argumentée et alignée avec les attentes du marché havrais.",
    href: "/estimation",
    icon: Compass,
  },
  {
    title: "Vente",
    description: "Valorisation premium, ciblage qualifié des acquéreurs et pilotage jusqu'à la signature.",
    href: "/vendre",
    icon: Handshake,
  },
  {
    title: "Location",
    description: "Sélection rigoureuse des candidats et accompagnement complet de la mise en location.",
    href: "/services",
    icon: Building2,
  },
];

const HERO_ROTATE_MS = 6500;
const HERO_KEN_BURNS_DURATION_S = HERO_ROTATE_MS / 1000 + 0.45;
const HERO_CROSS_FADE_DURATION_S = 1.35;
const HERO_PRELOAD_PRIORITY_COUNT = 3;
const HERO_FALLBACK_IMAGE_URL = "/images/le-havre-history/panorama-le-havre.jpg";
const HERO_EXCLUDED_IMAGE_PATTERN = /panorama-le-havre|foch\.staticlbi\.com\/original\/images\/header\/1\.jpg/i;
const HERO_SLIDE_BLEED_CLASS = "absolute -inset-[20vw] sm:-inset-14 md:-inset-10 z-[1]";
const HERO_MIN_DWELL_BEFORE_OVERRIDE_MS = HERO_ROTATE_MS - 600;
const HERO_MAX_SLIDES = 10;
const HERO_PROPERTY_RATIO = 0.6;

type HeroSlideSource = "property" | "scenic";
type HeroSlide = {
  id: string;
  motionSeed: number;
  title: string;
  imageUrl: string;
  source: HeroSlideSource;
};

type KenBurnsPoint = { scale: number; x: number; y: number };

type KenBurnsPreset = {
  from: KenBurnsPoint;
  to: KenBurnsPoint;
};

type CrossKenBurnsPreset = {
  from: KenBurnsPoint;
  to: KenBurnsPoint;
  exit: KenBurnsPoint;
};

type HeroTransitionEffectsProps = {
  active: boolean;
  transitionKey: string;
};

type HeroSlideIdentity = {
  id: string;
  imageUrl: string;
} | null;

const kenBurnsPresets: KenBurnsPreset[] = [
  { from: { scale: 1.24, x: -26, y: -14 }, to: { scale: 1.1, x: 10, y: 7 } },
  { from: { scale: 1.23, x: 24, y: -13 }, to: { scale: 1.09, x: -10, y: 7 } },
  { from: { scale: 1.23, x: -20, y: 14 }, to: { scale: 1.09, x: 11, y: -8 } },
  { from: { scale: 1.24, x: 20, y: 13 }, to: { scale: 1.1, x: -11, y: -8 } },
];

function createSeededRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const shuffled = [...items];
  const random = createSeededRng(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function shuffleWithRng<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function isExcludedHeroImage(url: string): boolean {
  return HERO_EXCLUDED_IMAGE_PATTERN.test(url);
}

function hashStringToSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function interleaveHeroSlides(propertyPool: HeroSlide[], scenicPool: HeroSlide[], seed: number): HeroSlide[] {
  const ordered: HeroSlide[] = [];
  let previousSource: HeroSlideSource | null = null;
  let sourceStreak = 0;
  const startsWithProperty = (seed & 1) === 0;

  while (propertyPool.length > 0 || scenicPool.length > 0) {
    const hasProperty = propertyPool.length > 0;
    const hasScenic = scenicPool.length > 0;

    let nextSource: HeroSlideSource;
    if (!hasScenic) {
      nextSource = "property";
    } else if (!hasProperty) {
      nextSource = "scenic";
    } else if (previousSource == null) {
      nextSource = startsWithProperty ? "property" : "scenic";
    } else {
      const opposite = previousSource === "property" ? "scenic" : "property";
      const oppositeAvailable = opposite === "property" ? hasProperty : hasScenic;
      if (sourceStreak >= 2 && oppositeAvailable) {
        nextSource = opposite;
      } else if (oppositeAvailable) {
        nextSource = opposite;
      } else {
        nextSource = previousSource;
      }
    }

    const nextSlide = nextSource === "property" ? propertyPool.shift() : scenicPool.shift();
    if (!nextSlide) {
      continue;
    }

    ordered.push(nextSlide);
    if (nextSlide.source === previousSource) {
      sourceStreak += 1;
    } else {
      previousSource = nextSlide.source;
      sourceStreak = 1;
    }
  }

  return ordered;
}

function buildHeroSlides(properties: Awaited<ReturnType<typeof getFeaturedProperties>>, seed: number): HeroSlide[] {
  const random = createSeededRng(seed ^ 0xa5a5a5a5);
  const orderedProperties = [...properties].sort((left, right) => left.id - right.id);

  const propertySlides = orderedProperties
    .map((property) => {
      const availableImages = property.images.filter((image) => image.sourceUrl && !isExcludedHeroImage(image.sourceUrl));
      if (!availableImages.length) {
        return null;
      }

      const selectableCount = Math.min(availableImages.length, 4);
      const imageIndex = Math.floor(random() * selectableCount);
      const selectedImage = availableImages[imageIndex] ?? availableImages[0];

      return {
        id: `property-${property.id}`,
        motionSeed: property.id,
        title: property.title,
        imageUrl: selectedImage?.sourceUrl ?? "",
        source: "property" as const,
      };
    })
    .filter((slide): slide is HeroSlide => Boolean(slide?.imageUrl));

  const uniqueProperties = Array.from(new Map(propertySlides.map((slide) => [slide.id, slide])).values());
  const uniquePropertyImages = Array.from(new Map(uniqueProperties.map((slide) => [slide.imageUrl, slide])).values());
  const propertyImageSet = new Set(uniquePropertyImages.map((slide) => slide.imageUrl));

  const scenicSlides = heroScenicImages
    .filter((scenic) => !isExcludedHeroImage(scenic.imageUrl))
    .filter((scenic) => !propertyImageSet.has(scenic.imageUrl))
    .map((scenic) => ({
      id: `scenic-${scenic.id}`,
      motionSeed: hashStringToSeed(scenic.id),
      title: scenic.title,
      imageUrl: scenic.imageUrl,
      source: "scenic" as const,
    }));
  const uniqueScenicImages = Array.from(new Map(scenicSlides.map((slide) => [slide.imageUrl, slide])).values());

  const targetPropertyCount = Math.round(HERO_MAX_SLIDES * HERO_PROPERTY_RATIO);
  const targetScenicCount = HERO_MAX_SLIDES - targetPropertyCount;

  const shuffledProperties = shuffleWithSeed(uniquePropertyImages, seed ^ 0x9e3779b9);
  const shuffledScenic = shuffleWithSeed(uniqueScenicImages, seed ^ 0x85ebca6b);

  const selectedProperties = shuffledProperties.slice(0, Math.min(targetPropertyCount, shuffledProperties.length));
  const selectedScenic = shuffledScenic.slice(0, Math.min(targetScenicCount, shuffledScenic.length));

  const remainingProperty = shuffledProperties.slice(selectedProperties.length);
  const remainingScenic = shuffledScenic.slice(selectedScenic.length);
  const remainderPool = shuffleWithSeed([...remainingProperty, ...remainingScenic], seed ^ 0xc2b2ae35);

  const combined: HeroSlide[] = [...selectedProperties, ...selectedScenic];
  for (const candidate of remainderPool) {
    if (combined.length >= HERO_MAX_SLIDES) {
      break;
    }
    combined.push(candidate);
  }

  const propertyPool = combined.filter((slide) => slide.source === "property");
  const scenicPool = combined.filter((slide) => slide.source === "scenic");
  return interleaveHeroSlides(propertyPool, scenicPool, seed);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getAlternatingKenBurnsPreset(slideId: number, motionStep: number, seed: number): KenBurnsPreset {
  const presetIndex = (Math.abs(slideId * 31 + motionStep * 13 + seed) % kenBurnsPresets.length) >>> 0;
  const basePreset = kenBurnsPresets[presetIndex];

  if (motionStep % 2 === 0) {
    // Even steps: zoom-out (start big, end smaller) — same as base preset
    return basePreset;
  }

  // Odd steps: zoom-in (start smaller, end bigger) — reverse direction
  return {
    from: {
      scale: clamp(basePreset.to.scale + 0.02, 1.08, 1.14),
      x: clamp(-basePreset.to.x * 0.86, -28, 28),
      y: clamp(-basePreset.to.y * 0.86, -18, 18),
    },
    to: {
      scale: clamp(basePreset.from.scale + 0.01, 1.2, 1.32),
      x: clamp(-basePreset.from.x * 0.68, -34, 34),
      y: clamp(-basePreset.from.y * 0.68, -22, 22),
    },
  };
}

function toCrossKenBurnsPreset(preset: KenBurnsPreset): CrossKenBurnsPreset {
  const driftX = preset.to.x - preset.from.x;
  const driftY = preset.to.y - preset.from.y;

  return {
    from: preset.from,
    to: preset.to,
    exit: {
      scale: clamp(preset.to.scale + 0.04, 1.08, 1.3),
      x: clamp(preset.to.x + driftX * 0.38, -34, 34),
      y: clamp(preset.to.y + driftY * 0.38, -22, 22),
    },
  };
}

function normalizeIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return index >= 0 ? index % length : (index + length) % length;
}

function collectReadyIndices(slides: HeroSlide[], readyUrls: Set<string>): number[] {
  return slides.reduce<number[]>((accumulator, slide, index) => {
    if (readyUrls.has(slide.imageUrl)) {
      accumulator.push(index);
    }
    return accumulator;
  }, []);
}

function HeroTransitionEffects({ active, transitionKey }: HeroTransitionEffectsProps) {
  if (!active) {
    return null;
  }

  return (
    <AnimatePresence initial={false} mode="sync">
      <motion.div
        key={`hero-ripple-${transitionKey}`}
        className="pointer-events-none absolute inset-0 z-[4]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.55) 0%, rgba(180,230,255,0.42) 18%, rgba(80,170,240,0.28) 38%, rgba(30,100,200,0.08) 60%, transparent 76%)",
        }}
        initial={{ opacity: 0, scale: 0.55 }}
        animate={{ opacity: [0, 1, 0.6, 0], scale: [0.55, 1.0, 1.35, 1.7] }}
        exit={{ opacity: 0 }}
        transition={{ duration: HERO_CROSS_FADE_DURATION_S * 1.1, ease: [0.16, 1, 0.3, 1] }}
      />
    </AnimatePresence>
  );
}

const heroImagePreloadCache = new Map<string, Promise<void>>();

function preloadHeroImage(url: string, priority: "high" | "low" = "low"): Promise<void> {
  if (!url) {
    return Promise.resolve();
  }

  const cached = heroImagePreloadCache.get(url);
  if (cached) {
    return cached;
  }

  const loadingPromise = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    (image as HTMLImageElement & { fetchPriority?: "high" | "low" | "auto" }).fetchPriority = priority;

    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to preload hero image: ${url}`));
    image.src = url;
  });

  heroImagePreloadCache.set(url, loadingPromise);
  return loadingPromise;
}

export default function HomePage() {
  const setSearchDrawerOpen = useUiStore((state) => state.setSearchDrawerOpen);
  const featuredQuery = useQuery({
    queryKey: ["featured-properties"],
    queryFn: () => getFeaturedProperties(24),
    staleTime: 1000 * 60 * 20,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const reviewsQuery = useQuery({ queryKey: ["agency-google-reviews-home"], queryFn: getAgencyReviews });
  const { reducedMotion } = useMotionPreference();
  const siteUrl = getSiteUrl();
  const [heroSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff));
  const heroRng = useMemo(() => createSeededRng(heroSeed ^ 0x243f6a88), [heroSeed]);
  const heroSlides = useMemo(() => buildHeroSlides(featuredQuery.data ?? [], heroSeed), [featuredQuery.data, heroSeed]);
  const heroImageUrls = useMemo(() => heroSlides.map((slide) => slide.imageUrl), [heroSlides]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [heroMotionStep, setHeroMotionStep] = useState(0);
  const [hasDisplayedHeroSlide, setHasDisplayedHeroSlide] = useState(false);
  const [readyHeroUrls, setReadyHeroUrls] = useState<Set<string>>(() => new Set([HERO_FALLBACK_IMAGE_URL]));
  const heroQueueRef = useRef<number[]>([]);
  const previousActiveHeroSlideRef = useRef<HeroSlideIdentity>(null);
  const heroSlidesRef = useRef<HeroSlide[]>(heroSlides);
  const readyHeroUrlsRef = useRef<Set<string>>(readyHeroUrls);
  const activeHeroIndexRef = useRef<number>(activeHeroIndex);
  const heroLastChangeAtRef = useRef<number>(Date.now());
  const heroSlideStartAtRef = useRef<number>(Date.now());
  const activeHeroIdentityRef = useRef<string | null>(null);
  const heroTimerIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    if (heroImageUrls.length === 0) {
      setReadyHeroUrls(new Set([HERO_FALLBACK_IMAGE_URL]));
      return;
    }

    let cancelled = false;
    setReadyHeroUrls((current) => {
      const next = new Set<string>([HERO_FALLBACK_IMAGE_URL]);
      heroImageUrls.forEach((imageUrl) => {
        if (current.has(imageUrl)) {
          next.add(imageUrl);
        }
      });
      return next;
    });

    heroImageUrls.forEach((imageUrl, index) => {
      void preloadHeroImage(imageUrl, index < HERO_PRELOAD_PRIORITY_COUNT ? "high" : "low")
        .then(() => {
          if (cancelled) return;

          setReadyHeroUrls((current) => {
            if (current.has(imageUrl)) return current;
            const next = new Set(current);
            next.add(imageUrl);
            return next;
          });
        })
        .catch(() => {
          if (cancelled) return;
          // Prevent a preload/network edge-case from freezing hero rotation on fallback media.
          setReadyHeroUrls((current) => {
            if (current.has(imageUrl)) return current;
            const next = new Set(current);
            next.add(imageUrl);
            return next;
          });
        });
    });

    return () => {
      cancelled = true;
    };
  }, [heroImageUrls]);

  useEffect(() => {
    heroSlidesRef.current = heroSlides;
  }, [heroSlides]);

  useEffect(() => {
    readyHeroUrlsRef.current = readyHeroUrls;
  }, [readyHeroUrls]);

  useEffect(() => {
    activeHeroIndexRef.current = activeHeroIndex;
  }, [activeHeroIndex]);

  useEffect(() => {
    if (heroSlides.length === 0) {
      setActiveHeroIndex(0);
      setHeroMotionStep(0);
      heroQueueRef.current = [];
      previousActiveHeroSlideRef.current = null;
      activeHeroIdentityRef.current = null;
      heroTimerIdentityRef.current = null;
      const now = Date.now();
      heroLastChangeAtRef.current = now;
      heroSlideStartAtRef.current = now;
      return;
    }

    const previousIdentity = previousActiveHeroSlideRef.current;
    let preservedIndex = -1;

    if (previousIdentity) {
      preservedIndex = heroSlides.findIndex(
        (slide) => slide.id === previousIdentity.id && slide.imageUrl === previousIdentity.imageUrl,
      );

      if (preservedIndex < 0) {
        preservedIndex = heroSlides.findIndex((slide) => slide.id === previousIdentity.id);
      }

      if (preservedIndex < 0) {
        preservedIndex = heroSlides.findIndex((slide) => slide.imageUrl === previousIdentity.imageUrl);
      }
    }

    if (preservedIndex >= 0) {
      const currentIndex = normalizeIndex(activeHeroIndexRef.current, heroSlides.length);
      const currentSlide = heroSlides[currentIndex];
      const currentReady = Boolean(currentSlide && readyHeroUrlsRef.current.has(currentSlide.imageUrl));
      const preservedSlide = heroSlides[preservedIndex];
      const preservedReady = Boolean(preservedSlide && readyHeroUrlsRef.current.has(preservedSlide.imageUrl));
      const elapsedSinceLastChange = Date.now() - heroLastChangeAtRef.current;

      if (!preservedReady && currentReady) {
        return;
      }

      if (currentReady && currentIndex !== preservedIndex && elapsedSinceLastChange < HERO_MIN_DWELL_BEFORE_OVERRIDE_MS) {
        return;
      }

      if (currentIndex !== preservedIndex) {
        setActiveHeroIndex(preservedIndex);
      }
    } else {
      setActiveHeroIndex(0);
      setHeroMotionStep(0);
      const now = Date.now();
      heroLastChangeAtRef.current = now;
      heroSlideStartAtRef.current = now;
      activeHeroIdentityRef.current = null;
      heroTimerIdentityRef.current = null;
    }

    heroQueueRef.current = [];
  }, [heroSlides]);

  useEffect(() => {
    if (heroSlides.length === 0) {
      heroQueueRef.current = [];
      return;
    }

    const normalizedIndex = normalizeIndex(activeHeroIndex, heroSlides.length);
    const currentSlide = heroSlides[normalizedIndex];
    const currentReady = Boolean(currentSlide && readyHeroUrls.has(currentSlide.imageUrl));

    if (currentReady) {
      return;
    }

    const firstReadyIndex = heroSlides.findIndex((slide) => readyHeroUrls.has(slide.imageUrl));
    if (firstReadyIndex >= 0 && firstReadyIndex !== normalizedIndex) {
      heroQueueRef.current = [];
      setActiveHeroIndex(firstReadyIndex);
    }
  }, [activeHeroIndex, heroSlides, readyHeroUrls]);

  const safeHeroIndex = useMemo(() => {
    if (heroSlides.length === 0) {
      return 0;
    }

    return normalizeIndex(activeHeroIndex, heroSlides.length);
  }, [activeHeroIndex, heroSlides]);

  const activeHeroSlide = heroSlides[safeHeroIndex];
  const isActiveHeroReady = Boolean(activeHeroSlide && readyHeroUrls.has(activeHeroSlide.imageUrl));
  const shouldShowHeroFallback = heroSlides.length === 0 || (!hasDisplayedHeroSlide && !isActiveHeroReady);
  const activeHeroIdentityKey = activeHeroSlide ? `${activeHeroSlide.id}:${activeHeroSlide.imageUrl}` : null;
  const activeHeroTransitionKey = activeHeroSlide
    ? `${activeHeroSlide.id}-${safeHeroIndex}-${activeHeroSlide.imageUrl}`
    : `hero-${safeHeroIndex}`;

  useEffect(() => {
    if (heroSlides.length === 0) {
      setHasDisplayedHeroSlide(false);
      return;
    }

    if (isActiveHeroReady) {
      setHasDisplayedHeroSlide(true);
    }
  }, [heroSlides.length, isActiveHeroReady]);

  useEffect(() => {
    if (!activeHeroIdentityKey) {
      activeHeroIdentityRef.current = null;
      return;
    }

    if (activeHeroIdentityRef.current === null) {
      activeHeroIdentityRef.current = activeHeroIdentityKey;
      const now = Date.now();
      heroLastChangeAtRef.current = now;
      heroSlideStartAtRef.current = now;
      return;
    }

    if (activeHeroIdentityRef.current !== activeHeroIdentityKey) {
      activeHeroIdentityRef.current = activeHeroIdentityKey;
      const now = Date.now();
      heroLastChangeAtRef.current = now;
      heroSlideStartAtRef.current = now;
      heroTimerIdentityRef.current = null;
      setHeroMotionStep((step) => step + 1);
    }
  }, [activeHeroIdentityKey]);

  useEffect(() => {
    previousActiveHeroSlideRef.current = activeHeroSlide
      ? { id: activeHeroSlide.id, imageUrl: activeHeroSlide.imageUrl }
      : null;
  }, [activeHeroSlide]);

  useEffect(() => {
    if (heroSlides.length <= 1) {
      heroQueueRef.current = [];
      heroTimerIdentityRef.current = null;
      return;
    }

    if (!activeHeroIdentityKey || !isActiveHeroReady) {
      heroTimerIdentityRef.current = null;
      return;
    }

    // When a new slide becomes ready, start a fresh dwell window for that visible slide.
    if (heroTimerIdentityRef.current !== activeHeroIdentityKey) {
      heroTimerIdentityRef.current = activeHeroIdentityKey;
      heroSlideStartAtRef.current = Date.now();
    }

    // Honour the full dwell time even if this effect reruns mid-cycle.
    const elapsed = Date.now() - heroSlideStartAtRef.current;
    const remaining = Math.max(HERO_ROTATE_MS - elapsed, 600);

    const timeoutId = window.setTimeout(() => {
      const latestSlides = heroSlidesRef.current;
      const latestReadyUrls = readyHeroUrlsRef.current;
      const readyIndices = collectReadyIndices(latestSlides, latestReadyUrls);

      if (readyIndices.length <= 1 || latestSlides.length <= 1) {
        heroQueueRef.current = [];
        return;
      }

      setActiveHeroIndex((current) => {
        const normalizedCurrent = normalizeIndex(current, latestSlides.length);
        const currentReadyIndex = readyIndices.includes(normalizedCurrent) ? normalizedCurrent : readyIndices[0];

        heroQueueRef.current = heroQueueRef.current.filter(
          (index) => readyIndices.includes(index) && index !== currentReadyIndex,
        );

        if (heroQueueRef.current.length === 0) {
          heroQueueRef.current = shuffleWithRng(
            readyIndices.filter((index) => index !== currentReadyIndex),
            heroRng,
          );
        }

        const next = heroQueueRef.current.shift();
        if (typeof next === "number") {
          return next;
        }

        return currentReadyIndex;
      });
    }, remaining);

    return () => window.clearTimeout(timeoutId);
  }, [activeHeroIdentityKey, activeHeroTransitionKey, heroRng, heroSlides.length, isActiveHeroReady]);

  const heroMood = inferPlaceImageMood(activeHeroSlide?.title, "Le Havre");
  const heroMotionDirector = useMemo(() => getMotionDirectorProfile(heroMood), [heroMood]);
  const crossKenBurnsPreset = useMemo(
    () =>
      activeHeroSlide
        ? toCrossKenBurnsPreset(getAlternatingKenBurnsPreset(activeHeroSlide.motionSeed, heroMotionStep, heroSeed))
        : toCrossKenBurnsPreset({ from: { scale: 1.1, x: -10, y: -6 }, to: { scale: 1.02, x: 6, y: 4 } }),
    [activeHeroSlide, heroMotionStep, heroSeed],
  );
  const ctaSweepStyle = useMemo(
    () => ({ "--glass-sweep-duration": `${heroMotionDirector.ctaSweepDuration}s` }) as CSSProperties,
    [heroMotionDirector.ctaSweepDuration],
  );

  useSeo({
    title: "Foch Immobilier | Immobilier d'exception au Havre",
    description:
      "Depuis 1972, Foch Immobilier accompagne vos projets de vente, location et gestion locative au Havre et sur le littoral.",
    canonicalPath: "/",
    image: heroSlides[0]?.imageUrl,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Foch Immobilier",
        url: siteUrl,
        address: {
          "@type": "PostalAddress",
          streetAddress: "109 Av. Foch",
          postalCode: "76600",
          addressLocality: "Le Havre",
          addressCountry: "FR",
        },
        telephone: "+33235425176",
      },
      {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        name: "Foch Immobilier",
        url: siteUrl,
        areaServed: ["Le Havre", "Sainte-Adresse", "Montivilliers"],
        serviceType: ["Achat immobilier", "Vente immobilière", "Location", "Gestion locative", "Estimation immobilière"],
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Foch Immobilier",
        url: siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/biens?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  });

  return (
    <>
      <section className="relative min-h-[68vh] overflow-hidden">
        {shouldShowHeroFallback && (
          <img
            src={HERO_FALLBACK_IMAGE_URL}
            alt="Panorama du Havre"
            className="absolute inset-0 z-0 h-full w-full object-cover"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        )}
        <AnimatePresence initial={false} mode="sync">
          {heroSlides.length > 0 && isActiveHeroReady && (
            <motion.div
              key={activeHeroTransitionKey}
              className={HERO_SLIDE_BLEED_CLASS}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={
                reducedMotion
                  ? { duration: 0.4, ease: "easeOut" }
                  : { duration: HERO_CROSS_FADE_DURATION_S, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <motion.div
                className="h-full w-full will-change-transform"
                transition={
                  reducedMotion
                    ? { duration: 0.3, ease: "linear" }
                    : { duration: HERO_KEN_BURNS_DURATION_S, ease: [0.25, 0.1, 0.25, 1] }
                }
                initial={reducedMotion ? { scale: 1, x: 0, y: 0 } : crossKenBurnsPreset.from}
                animate={reducedMotion ? { scale: 1, x: 0, y: 0 } : crossKenBurnsPreset.to}
                exit={
                  reducedMotion
                    ? { scale: 1, x: 0, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
                    : {
                        ...crossKenBurnsPreset.exit,
                        transition: { duration: HERO_CROSS_FADE_DURATION_S, ease: [0.22, 1, 0.36, 1] },
                      }
                }
                style={{ transformOrigin: "center center" }}
              >
                <img
                  src={heroSlides[safeHeroIndex].imageUrl}
                  alt={heroSlides[safeHeroIndex].title}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  onError={(event) => {
                    const image = event.currentTarget;
                    if (image.src !== new URL(HERO_FALLBACK_IMAGE_URL, window.location.href).href) {
                      image.src = HERO_FALLBACK_IMAGE_URL;
                    }
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute inset-0 z-[3] bg-gradient-to-br from-black/55 via-black/35 to-black/55" />
        <HeroTransitionEffects
          active={!reducedMotion && heroSlides.length > 1 && isActiveHeroReady}
          transitionKey={activeHeroTransitionKey}
        />
        <div className="container relative z-[5] mx-auto flex min-h-[68vh] flex-col justify-center px-4 py-16">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0.3 : heroMotionDirector.revealDuration }}
            className="max-w-4xl font-display text-4xl text-white md:text-6xl"
          >
            Immobilier d'exception au Havre et sur la côte
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0.3 : heroMotionDirector.revealDuration, delay: reducedMotion ? 0.08 : heroMotionDirector.revealStagger * 2 }}
            className="mt-4 max-w-2xl text-base text-white/85 md:text-lg"
          >
            Depuis 1972, nos conseillers dédiés accompagnent vendeurs, acquéreurs, bailleurs et locataires avec une approche sur mesure.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0.3 : heroMotionDirector.revealDuration, delay: reducedMotion ? 0.12 : heroMotionDirector.revealStagger * 3 }}
            className="mt-8 flex flex-wrap gap-3"
            style={ctaSweepStyle}
          >
            <Button size="lg" className="glass-sweep" asChild>
              <Link to="/biens">Explorer les biens</Link>
            </Button>
            <Button size="lg" variant="brand" className="glass-sweep" asChild>
              <Link to="/estimation">Estimer votre bien</Link>
            </Button>
            <Button
              size="lg"
              variant="brand"
              onClick={() => {
                setSearchDrawerOpen(true);
              }}
              className="gap-2"
            >
              <Search className="h-4 w-4" /> Rechercher un bien d'exception
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="pt-8 pb-4 md:py-12">
        <ScrollReveal mood={heroMood}>
          <MarketCounters />
        </ScrollReveal>
      </section>

      <section className="container mx-auto px-4 pt-8 pb-16 md:py-16">
        <ScrollReveal mood={heroMood}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl">Sélection du moment</h2>
              <p className="mt-1 text-sm text-muted-foreground">Une sélection de biens d'exception actuellement disponibles à la vente et à la location.</p>
            </div>
            <Link to="/biens" className="inline-flex items-center gap-1 text-sm hover:underline">
              Découvrir tous les biens
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </ScrollReveal>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featuredQuery.isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[320px] animate-pulse rounded-2xl bg-muted/60" />
            ))}
          {(featuredQuery.data ?? []).slice(0, 6).map((property, index) => (
            <ListingCard
              key={property.id}
              item={toSearchItem(property)}
              revealIndex={index}
              className="paper-grain [--paper-grain-opacity:0.032] [--paper-grain-mobile-reduction:0.018]"
            />
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14">
        <ScrollReveal mood={heroMood}>
          <h2 className="font-display text-3xl">Explorer par ville</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Explorez nos pages locales pour affiner votre recherche sur Le Havre et ses communes voisines.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {cities.map((city) => (
              <Link
                key={city.id}
                to={`/immobilier/${city.slug}`}
                className="rounded-full border border-border px-4 py-2 text-sm transition hover:bg-card"
              >
                Immobilier {city.name}
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/histoire-immobilier-le-havre" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-card">
              Le Havre & patrimoine immobilier
            </Link>
            <Link to="/avis" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-card">
              <GoogleGIcon size={14} decorative />
              Lire les avis clients
            </Link>
          </div>
        </ScrollReveal>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto grid gap-6 px-4 py-14 md:grid-cols-3">
          {serviceCards.map((card, index) => (
            <ScrollReveal key={card.title} mood={heroMood} delay={Math.min(index * heroMotionDirector.revealStagger, 0.24)}>
              <Link
                to={card.href}
                className="paper-grain paper-grain-soft [--paper-grain-mobile-reduction:0.014] group block h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-[0_18px_44px_-30px_hsl(var(--brand)/0.35)]"
              >
                <card.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-hover:text-brand-strong" />
                <h3 className="mt-4 font-display text-2xl">{card.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {reviewsQuery.data && (
        <section className="container mx-auto px-4 py-16">
          <ScrollReveal mood={heroMood}>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/80 shadow-sm">
                    <GoogleGIcon size={16} decorative />
                  </span>
                  <h2 className="font-display text-3xl">Avis Google</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Note moyenne {reviewsQuery.data.rating.toFixed(1)} / 5 ({reviewsQuery.data.userRatingCount} avis).
                </p>
              </div>
              <Link to="/avis" className="inline-flex items-center gap-1.5 text-sm hover:underline">
                <GoogleGIcon size={14} decorative />
                Consulter tous les avis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </ScrollReveal>

          <div className="grid gap-4 md:grid-cols-3">
            {reviewsQuery.data.reviews.slice(0, 3).map((review, index) => (
              <ScrollReveal key={review.id} mood={heroMood} delay={Math.min(index * heroMotionDirector.revealStagger, 0.24)}>
                <article className="rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-[0_18px_40px_-34px_hsl(var(--brand)/0.3)]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{review.authorName}</p>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background/80">
                      <GoogleGIcon size={11} decorative />
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{review.text}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-16">
        <ScrollReveal mood={heroMood}>
          <h2 className="font-display text-3xl">L'équipe</h2>
          <p className="mt-1 text-sm text-muted-foreground">Des interlocuteurs identifiés pour chaque projet.</p>
        </ScrollReveal>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {agents.map((agent, index) => (
            <ScrollReveal key={agent.id} mood={heroMood} delay={Math.min(index * heroMotionDirector.revealStagger, 0.25)}>
              <article className="group rounded-2xl border border-border p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-[0_18px_40px_-34px_hsl(var(--brand)/0.3)]">
                <img
                  src={agent.portraitUrl}
                  alt={agent.fullName}
                  className="h-16 w-16 rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <h3 className="mt-3 font-display text-xl">{agent.fullName}</h3>
                <p className="text-sm text-muted-foreground">{agent.role}</p>
                <a className="mt-2 block text-sm hover:underline" href={`tel:${agent.phone.replace(/\s+/g, "")}`}>
                  {agent.phone}
                </a>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </>
  );
}
