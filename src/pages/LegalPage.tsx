import FeesPage from "@/features/content/pages/FeesPage";
import LegalTextPage, { type LegalPageKey } from "@/features/content/pages/LegalTextPage";

interface LegalPageProps {
  page: "fees" | "privacy" | "cookies" | "notice";
}

const legalPageKeys: Record<Exclude<LegalPageProps["page"], "fees">, LegalPageKey> = {
  privacy: "confidentialite",
  cookies: "cookies",
  notice: "mentions-legales",
};

/** Legacy imports reuse the current published content and agency details. */
export default function LegalPage({ page }: LegalPageProps) {
  return page === "fees" ? <FeesPage /> : <LegalTextPage page={legalPageKeys[page]} />;
}
