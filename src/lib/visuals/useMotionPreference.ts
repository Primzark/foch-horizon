import { useReducedMotion } from "framer-motion";
import { useUiStore } from "@/lib/state/useUiStore";

export function useMotionPreference() {
  const systemPrefersReducedMotion = useReducedMotion();
  const motionPreference = useUiStore((state) => state.motionPreference);

  const reducedMotion =
    motionPreference === "reduced" ||
    (motionPreference === "system" && Boolean(systemPrefersReducedMotion));

  return {
    reducedMotion,
    motionPreference,
  };
}
