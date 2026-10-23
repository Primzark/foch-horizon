const AGENCY_REFERENCES = /\b(?:foch\s+immobilier|our agency|our team|our services|l'agence|notre agence|chez foch)\b/iu;
const AGENCY_CALL_TO_ACTION = /\b(?:n['’]h[eé]sitez\s+pas\s+à\s+nous\s+contacter|contactez[-\s]+nous|contact\s+(?:our\s+)?(?:agency|team)|get\s+in\s+touch\s+with\s+us|we(?:'re|\s+are)\s+here\s+to\s+help|for\s+your\s+(?:real\s+estate|property)\s+project|pour\s+(?:tout|vos)\s+projet(?:s)?\s+immobilier)\b/iu;
const AGENCY_QUESTION = /\b(?:foch|agence|agency|services\s+(?:de\s+)?(?:l'agence|the\s+agency))\b/iu;

/** Remove unsolicited first-party agency copy from answers to general live web questions. */
export function removeUnsolicitedAgencyPromotion(answer: string, question: string, language: "fr" | "en"): string {
  if (AGENCY_QUESTION.test(question)) return answer.trim();

  const sentences = answer
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => !AGENCY_REFERENCES.test(sentence) && !AGENCY_CALL_TO_ACTION.test(sentence));

  if (sentences.length > 0) return sentences.join(" ");
  return language === "en"
    ? "I found live sources for this question. Please consult the source cards for the available evidence."
    : "J’ai trouvé des sources en direct sur cette question. Consultez les cartes de sources pour les éléments disponibles.";
}
