type SiteChatbotModule = typeof import("@/features/content/components/SiteChatbot");

let siteChatbotModulePromise: Promise<SiteChatbotModule> | null = null;

export function preloadSiteChatbot(): Promise<SiteChatbotModule> {
  if (!siteChatbotModulePromise) {
    siteChatbotModulePromise = import("@/features/content/components/SiteChatbot").catch((error: unknown) => {
      siteChatbotModulePromise = null;
      throw error;
    });
  }

  return siteChatbotModulePromise;
}
