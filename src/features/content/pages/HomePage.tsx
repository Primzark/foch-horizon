import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Compass, Handshake, Search } from "lucide-react";
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
import { PlaceAtmosphereLayer } from "@/components/visuals/PlaceAtmosphereLayer";
import { ScrollReveal } from "@/components/visuals/ScrollReveal";
import { LivingPhotoWebGL } from "@/components/visuals/LivingPhotoWebGL";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";
import { getMotionDirectorProfile } from "@/lib/visuals/motionDirector";

const serviceCards = [
  {
    title: "Estimation",
    description: "Obtenez une estimation argumentée de votre bien à partir de notre connaissance locale.",
    href: "/estimation",
    icon: Compass,
  },
  {
    title: "Vente",
    description: "Mise en valeur, qualification acheteurs et suivi de la négociation jusqu'à l'acte.",
    href: "/vendre",
    icon: Handshake,
  },
  {
    title: "Location",
    description: "Recherche locataire, constitution dossier et accompagnement de la gestion courante.",
    href: "/services",
    icon: Building2,
  },
];

const HERO_ROTATE_MS = 6500;
const HERO_KEN_BURNS_DURATION_S = HERO_ROTATE_MS / 1000 + 0.45;
const HERO_CROSS_FADE_DURATION_S = 1.35;
const HERO_PRELOAD_PRIORITY_COUNT = 3;
const HERO_FALLBACK_IMAGE_URL = "/images/le-havre-history/panorama-le-havre.jpg";

type HeroSlide = {
  id: number;
  title: string;
  imageUrl: string;
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

const kenBurnsPresets: KenBurnsPreset[] = [
  { from: { scale: 1.2, x: -30, y: -16 }, to: { scale: 1.03, x: 13, y: 9 } },
  { from: { scale: 1.18, x: 26, y: -14 }, to: { scale: 1.03, x: -12, y: 8 } },
  { from: { scale: 1.18, x: -22, y: 16 }, to: { scale: 1.02, x: 15, y: -10 } },
  { from: { scale: 1.19, x: 22, y: 14 }, to: { scale: 1.03, x: -15, y: -10 } },
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

function buildHeroSlides(properties: Awaited<ReturnType<typeof getFeaturedProperties>>, seed: number): HeroSlide[] {
  const random = createSeededRng(seed ^ 0xa5a5a5a5);

  const slides = properties
    .map((property) => {
      if (!property.images.length) {
        return null;
      }

      const selectableCount = Math.min(property.images.length, 4);
      const imageIndex = Math.floor(random() * selectableCount);
      const selectedImage = property.images[imageIndex] ?? property.images[0];

      return {
        id: property.id,
        title: property.title,
        imageUrl: selectedImage?.sourceUrl ?? "",
      };
    })
    .filter((slide): slide is HeroSlide => Boolean(slide?.imageUrl));

  const deduplicated = Array.from(new Map(slides.map((slide) => [slide.id, slide])).values());
  const shuffled = shuffleWithSeed(deduplicated, seed ^ 0x9e3779b9);
  const desiredCount = shuffled.length <= 6 ? shuffled.length : Math.min(shuffled.length, 10);
  return shuffled.slice(0, desiredCount);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getAlternatingKenBurnsPreset(slideId: number, motionStep: number, seed: number): KenBurnsPreset {
  const presetIndex = (Math.abs(slideId * 31 + motionStep * 13 + seed) % kenBurnsPresets.length) >>> 0;
  const basePreset = kenBurnsPresets[presetIndex];

  if (motionStep % 2 === 0) {
    return basePreset;
  }

  return {
    from: {
      scale: clamp(basePreset.to.scale + 0.03, 1.03, 1.09),
      x: clamp(-basePreset.to.x * 0.88, -32, 32),
      y: clamp(-basePreset.to.y * 0.88, -20, 20),
    },
    to: {
      scale: clamp(basePreset.from.scale - 0.02, 1.12, 1.24),
      x: clamp(-basePreset.from.x * 0.72, -40, 40),
      y: clamp(-basePreset.from.y * 0.72, -24, 24),
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
      scale: clamp(preset.to.scale + 0.05, 1, 1.24),
      x: clamp(preset.to.x + driftX * 0.45, -40, 40),
      y: clamp(preset.to.y + driftY * 0.45, -26, 26),
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
    <>
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={`hero-ripple-${transitionKey}`}
          className="pointer-events-none absolute inset-0 z-[4]"
          style={{
            background:
              "radial-gradient(circle at 48% 58%, rgba(208,240,255,0.46) 0%, rgba(158,216,250,0.35) 20%, rgba(90,154,217,0.2) 40%, rgba(26,73,125,0.04) 60%, rgba(11,35,66,0) 74%)",
            mixBlendMode: "screen",
          }}
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: [0, 0.6, 0], scale: [0.82, 1.04, 1.22] }}
          exit={{ opacity: 0 }}
          transition={{ duration: HERO_CROSS_FADE_DURATION_S, ease: [0.22, 1, 0.36, 1] }}
        />
      </AnimatePresence>

      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={`hero-liquid-wipe-${transitionKey}`}
          className="pointer-events-none absolute inset-y-0 left-[-42%] z-[4] w-[84%]"
          style={{
            background:
              "linear-gradient(105deg, rgba(140,202,244,0) 0%, rgba(193,232,255,0.62) 34%, rgba(255,255,255,0.5) 50%, rgba(74,154,214,0.34) 66%, rgba(26,67,116,0) 100%)",
            mixBlendMode: "screen",
            filter: "blur(10px)",
            borderRadius: "999px",
            maskImage:
              "radial-gradient(120% 85% at 35% 50%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 36%, rgba(255,255,255,0.48) 60%, rgba(255,255,255,0.14) 80%, transparent 100%)",
          }}
          initial={{ x: "-18%", opacity: 0, rotate: -1.2 }}
          animate={{ x: ["-18%", "112%"], opacity: [0, 0.72, 0], rotate: [-1.2, 0.9] }}
          exit={{ opacity: 0 }}
          transition={{ duration: HERO_CROSS_FADE_DURATION_S, ease: [0.22, 1, 0.36, 1] }}
        />
      </AnimatePresence>

      <motion.div
        className="pointer-events-none absolute inset-0 z-[4]"
        style={{
          background:
            "linear-gradient(110deg, rgba(255,255,255,0) 20%, rgba(196,234,255,0.16) 36%, rgba(255,255,255,0.3) 48%, rgba(166,214,247,0.16) 62%, rgba(255,255,255,0) 78%)",
          mixBlendMode: "screen",
          maskImage: "linear-gradient(to bottom, transparent 26%, rgba(255,255,255,0.96) 100%)",
        }}
        animate={{ x: ["-34%", "24%", "-28%"] }}
        transition={{ duration: 14.5, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
      />
    </>
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
    if (/^https?:\/\//.test(url)) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to preload hero image: ${url}`));
    image.src = url;
  });

  heroImagePreloadCache.set(url, loadingPromise);
  return loadingPromise;
}

export default function HomePage() {
  const setSearchDrawerOpen = useUiStore((state) => state.setSearchDrawerOpen);
  const featuredQuery = useQuery({ queryKey: ["featured-properties"], queryFn: () => getFeaturedProperties(24) });
  const reviewsQuery = useQuery({ queryKey: ["agency-google-reviews-home"], queryFn: getAgencyReviews });
  const { reducedMotion } = useMotionPreference();
  const siteUrl = getSiteUrl();
  const [heroSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff));
  const heroRng = useMemo(() => createSeededRng(heroSeed ^ 0x243f6a88), [heroSeed]);
  const heroSlides = useMemo(() => buildHeroSlides(featuredQuery.data ?? [], heroSeed), [featuredQuery.data, heroSeed]);
  const heroSlidesSignature = useMemo(
    () => heroSlides.map((slide) => `${slide.id}:${slide.imageUrl}`).join("|"),
    [heroSlides],
  );
  const heroImageUrls = useMemo(() => heroSlides.map((slide) => slide.imageUrl), [heroSlides]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [heroMotionStep, setHeroMotionStep] = useState(0);
  const [readyHeroUrls, setReadyHeroUrls] = useState<Set<string>>(() => new Set([HERO_FALLBACK_IMAGE_URL]));
  const heroQueueRef = useRef<number[]>([]);
  const previousActiveHeroIndexRef = useRef<number | null>(null);

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
        });
    });

    return () => {
      cancelled = true;
    };
  }, [heroImageUrls]);

  useEffect(() => {
    if (heroSlides.length === 0) {
      setActiveHeroIndex(0);
      setHeroMotionStep(0);
      heroQueueRef.current = [];
      previousActiveHeroIndexRef.current = null;
      return;
    }

    const random = createSeededRng(heroSeed ^ 0x3c6ef372);
    setActiveHeroIndex(Math.floor(random() * heroSlides.length));
    setHeroMotionStep(0);
    heroQueueRef.current = [];
    previousActiveHeroIndexRef.current = null;
  }, [heroSeed, heroSlides.length, heroSlidesSignature]);

  useEffect(() => {
    if (heroSlides.length <= 1) {
      return;
    }

    const normalizedActive = normalizeIndex(activeHeroIndex, heroSlides.length);

    if (previousActiveHeroIndexRef.current == null) {
      previousActiveHeroIndexRef.current = normalizedActive;
      return;
    }

    if (normalizedActive !== previousActiveHeroIndexRef.current) {
      setHeroMotionStep((step) => step + 1);
      previousActiveHeroIndexRef.current = normalizedActive;
    }
  }, [activeHeroIndex, heroSlides.length]);

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

  useEffect(() => {
    if (heroSlides.length <= 1) {
      heroQueueRef.current = [];
      return;
    }

    const timer = window.setInterval(() => {
      const readyIndices = collectReadyIndices(heroSlides, readyHeroUrls);

      if (readyIndices.length <= 1) {
        heroQueueRef.current = [];
        return;
      }

      setActiveHeroIndex((current) => {
        if (heroSlides.length <= 1 || readyIndices.length <= 1) {
          heroQueueRef.current = [];
          return current;
        }

        const normalizedCurrent = normalizeIndex(current, heroSlides.length);
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
    }, HERO_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [heroRng, heroSlides, readyHeroUrls]);

  const safeHeroIndex = useMemo(() => {
    if (heroSlides.length === 0) {
      return 0;
    }

    return normalizeIndex(activeHeroIndex, heroSlides.length);
  }, [activeHeroIndex, heroSlides]);

  const activeHeroSlide = heroSlides[safeHeroIndex];
  const isActiveHeroReady = Boolean(activeHeroSlide && readyHeroUrls.has(activeHeroSlide.imageUrl));
  const activeHeroTransitionKey = activeHeroSlide ? `${activeHeroSlide.id}-${safeHeroIndex}` : `hero-${safeHeroIndex}`;
  const heroMood = inferPlaceImageMood(activeHeroSlide?.title, "Le Havre");
  const heroMotionDirector = useMemo(() => getMotionDirectorProfile(heroMood), [heroMood]);
  const crossKenBurnsPreset = useMemo(
    () =>
      activeHeroSlide
        ? toCrossKenBurnsPreset(getAlternatingKenBurnsPreset(activeHeroSlide.id, heroMotionStep, heroSeed))
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
      "Foch Immobilier vous accompagne depuis 1972 pour vos projets de vente, location et administration de biens au Havre.",
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
        serviceType: ["Achat immobilier", "Vente immobiliere", "Location", "Gestion locative", "Estimation immobiliere"],
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
        <img
          src={HERO_FALLBACK_IMAGE_URL}
          alt="Panorama du Havre"
          className="absolute inset-0 z-0 h-full w-full object-cover"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <AnimatePresence initial={false} mode="sync">
          {heroSlides.length > 0 && isActiveHeroReady && (
            <motion.div
              key={`${heroSlides[safeHeroIndex].id}-${safeHeroIndex}`}
              className="absolute inset-0 z-[1]"
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
                <LivingPhotoWebGL
                  imageUrl={heroSlides[safeHeroIndex].imageUrl}
                  alt={heroSlides[safeHeroIndex].title}
                  mood={heroMood}
                  depthMapUrl="/images/motion/hero-depth-map.svg"
                  maskUrl="/images/motion/sea-mask.svg"
                  fallbackImageUrl="/images/le-havre-history/panorama-le-havre.jpg"
                  reducedMotion={reducedMotion}
                  qualityTier={reducedMotion ? undefined : "high"}
                  qualityBoost={!reducedMotion}
                  className="h-full w-full"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {heroSlides.length > 0 && <PlaceAtmosphereLayer mood={heroMood} animated={!reducedMotion} className="z-[2]" />}
        <div className="absolute inset-0 z-[3] bg-gradient-to-br from-black/55 via-black/35 to-black/55" />
        <HeroTransitionEffects active={!reducedMotion && heroSlides.length > 1} transitionKey={activeHeroTransitionKey} />
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
            Depuis 1972, notre équipe accompagne les vendeurs, acquéreurs, bailleurs et locataires avec une approche sur-mesure.
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
            <Button size="lg" variant="outline" className="glass-sweep" asChild>
              <Link to="/estimation">Estimer mon bien</Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                setSearchDrawerOpen(true);
              }}
              className="gap-2"
            >
              <Search className="h-4 w-4" /> Rechercher un bien
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <ScrollReveal mood={heroMood}>
          <MarketCounters />
        </ScrollReveal>
      </section>

      <section className="container mx-auto px-4 py-16">
        <ScrollReveal mood={heroMood}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl">Sélection du moment</h2>
              <p className="mt-1 text-sm text-muted-foreground">Une sélection de biens actifs à la vente et à la location.</p>
            </div>
            <Link to="/biens" className="inline-flex items-center gap-1 text-sm hover:underline">
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal mood={heroMood} delay={heroMotionDirector.revealStagger + 0.02}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {(featuredQuery.data ?? []).slice(0, 6).map((property, index) => (
              <ListingCard key={property.id} item={toSearchItem(property)} revealIndex={index} />
            ))}
          </div>
        </ScrollReveal>
      </section>

      <section className="container mx-auto px-4 pb-14">
        <ScrollReveal mood={heroMood}>
          <h2 className="font-display text-3xl">Explorer par ville</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pages locales dédiées pour faciliter votre recherche immobilière par secteur.
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
              Histoire de l'immobilier au Havre
            </Link>
            <Link to="/avis" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-card">
              Lire les avis clients Google
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
                className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-[0_18px_44px_-30px_hsl(var(--brand)/0.35)]"
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
                <h2 className="font-display text-3xl">Avis Google</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Note moyenne {reviewsQuery.data.rating.toFixed(1)} / 5 ({reviewsQuery.data.userRatingCount} avis).
                </p>
              </div>
              <Link to="/avis" className="inline-flex items-center gap-1 text-sm hover:underline">
                Voir tous les avis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </ScrollReveal>

          <div className="grid gap-4 md:grid-cols-3">
            {reviewsQuery.data.reviews.slice(0, 3).map((review, index) => (
              <ScrollReveal key={review.id} mood={heroMood} delay={Math.min(index * heroMotionDirector.revealStagger, 0.24)}>
                <article className="rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-[0_18px_40px_-34px_hsl(var(--brand)/0.3)]">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{review.authorName}</p>
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
