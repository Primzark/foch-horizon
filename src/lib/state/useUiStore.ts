import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  searchDrawerOpen: boolean;
  setSearchDrawerOpen: (isOpen: boolean) => void;
  cookieConsent: "accepted" | "rejected" | "unset";
  setCookieConsent: (consent: UiState["cookieConsent"]) => void;
  motionPreference: "system" | "reduced";
  setMotionPreference: (preference: UiState["motionPreference"]) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      searchDrawerOpen: false,
      setSearchDrawerOpen: (isOpen) => set({ searchDrawerOpen: isOpen }),
      cookieConsent: "unset",
      setCookieConsent: (consent) => set({ cookieConsent: consent }),
      motionPreference: "system",
      setMotionPreference: (preference) => set({ motionPreference: preference }),
    }),
    {
      name: "foch_ui",
      partialize: (state) => ({ cookieConsent: state.cookieConsent, motionPreference: state.motionPreference }),
    },
  ),
);
