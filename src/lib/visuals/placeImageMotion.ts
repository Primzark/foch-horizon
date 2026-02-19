export type PlaceImageMood = "coastal" | "heritage" | "urban" | "residential";

export interface PlaceImageMotionPreset {
  enterScale: number;
  enterY: number;
  hoverScale: number;
  hoverY: number;
  overlayClassName: string;
  hoverClassName: string;
  floatDuration: number;
}

const placeImageMotionPresets: Record<PlaceImageMood, PlaceImageMotionPreset> = {
  coastal: {
    enterScale: 1.06,
    enterY: 8,
    hoverScale: 1.075,
    hoverY: -4,
    overlayClassName: "from-black/56 via-black/18 to-transparent",
    hoverClassName: "duration-500 group-hover:scale-[1.07] group-hover:-translate-y-1",
    floatDuration: 16,
  },
  heritage: {
    enterScale: 1.04,
    enterY: 6,
    hoverScale: 1.055,
    hoverY: -2,
    overlayClassName: "from-amber-900/40 via-orange-700/14 to-transparent",
    hoverClassName: "duration-500 group-hover:scale-[1.05] group-hover:rotate-[0.25deg]",
    floatDuration: 18,
  },
  urban: {
    enterScale: 1.035,
    enterY: 5,
    hoverScale: 1.05,
    hoverY: -2,
    overlayClassName: "from-zinc-900/44 via-black/14 to-transparent",
    hoverClassName: "duration-450 group-hover:scale-[1.05] group-hover:-translate-y-0.5",
    floatDuration: 15,
  },
  residential: {
    enterScale: 1.03,
    enterY: 4,
    hoverScale: 1.045,
    hoverY: -2,
    overlayClassName: "from-emerald-900/35 via-emerald-700/12 to-transparent",
    hoverClassName: "duration-450 group-hover:scale-[1.045] group-hover:-translate-y-0.5",
    floatDuration: 14,
  },
};

const coastalPattern =
  /\b(mer|plage|port|docks|vauban|maritime|waterfront|front de mer|saint-vincent|saint-francois|le havre|eure|bassin)\b/;
const heritagePattern =
  /\b(perret|patrimoine|histor|eglise|hotel de ville|unesco|monument|saint-joseph|graville|architecture)\b/;
const residentialPattern =
  /\b(maison|villa|jardin|famille|residentiel|pavillon|maneglise|montivilliers|gainneville)\b/;
const urbanPattern = /\b(centre|ville|appartement|urbain|commerce|gare|quartier)\b/;

function normalizeHint(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function inferPlaceImageMood(...hints: Array<string | null | undefined>): PlaceImageMood {
  const normalized = hints
    .filter((hint): hint is string => typeof hint === "string" && hint.trim().length > 0)
    .map((hint) => normalizeHint(hint))
    .join(" ");

  if (normalized.length === 0) {
    return "urban";
  }

  if (heritagePattern.test(normalized)) return "heritage";
  if (coastalPattern.test(normalized)) return "coastal";
  if (residentialPattern.test(normalized)) return "residential";
  if (urbanPattern.test(normalized)) return "urban";

  return "urban";
}

export function getPlaceImageMotionPreset(mood: PlaceImageMood): PlaceImageMotionPreset {
  return placeImageMotionPresets[mood];
}
