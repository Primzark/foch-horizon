import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  searchDrawerOpen: boolean;
  setSearchDrawerOpen: (isOpen: boolean) => void;
  cookieConsent: "accepted" | "rejected" | "unset";
  setCookieConsent: (consent: UiState["cookieConsent"]) => void;
  cookiePreferencesOpen: boolean;
  setCookiePreferencesOpen: (isOpen: boolean) => void;
  motionPreference: "system" | "reduced";
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      searchDrawerOpen: false,
      setSearchDrawerOpen: (isOpen) => set({ searchDrawerOpen: isOpen }),
      cookieConsent: "unset",
      setCookieConsent: (consent) => set({ cookieConsent: consent }),
      cookiePreferencesOpen: false,
      setCookiePreferencesOpen: (isOpen) => set({ cookiePreferencesOpen: isOpen }),
      motionPreference: "system",
    }),
    {
      name: "foch_ui",
      version: 2,
      migrate: (persistedState) => {
        const state =
          (persistedState as
            | { cookieConsent?: UiState["cookieConsent"]; motionPreference?: UiState["motionPreference"] }
            | undefined) ?? {};
        return {
          cookieConsent: state.cookieConsent ?? "unset",
          motionPreference: "system",
        };
      },
      partialize: (state) => ({ cookieConsent: state.cookieConsent, motionPreference: state.motionPreference }),
    },
  ),
);
