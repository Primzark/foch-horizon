export type PhotoAttributionCredit = {
  title: string;
  creator: string;
  sourceUrl: string;
  license: string;
  licenseUrl?: string;
  modification: string;
};

type PhotoAttributionProps = {
  credit: PhotoAttributionCredit;
  heroOverlay?: boolean;
};

export function PhotoAttribution({ credit, heroOverlay = false }: PhotoAttributionProps) {
  const detailsClassName = heroOverlay
    ? "group pointer-events-none absolute inset-0 z-20 text-right text-white/70"
    : "group absolute bottom-1 right-1 z-20 text-right text-white/70";
  const summaryClassName = heroOverlay
    ? "pointer-events-auto absolute bottom-1 right-1 inline-flex min-h-6 cursor-pointer list-none items-center px-1 py-1 text-xs font-normal leading-none underline decoration-white/35 underline-offset-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] transition-colors hover:text-white/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/70 [&::-webkit-details-marker]:hidden"
    : "inline-flex min-h-6 cursor-pointer list-none items-center px-1 py-1 text-xs font-normal leading-none underline decoration-white/35 underline-offset-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] transition-colors hover:text-white/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/70 [&::-webkit-details-marker]:hidden";
  const contentClassName = heroOverlay
    ? "pointer-events-auto fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+5rem)] z-[60] max-h-20 overflow-y-auto rounded-lg border border-white/20 bg-slate-950/90 p-2 text-left text-[10px] leading-tight text-white/95 shadow-lg backdrop-blur-sm md:left-auto md:right-4 md:top-[calc(env(safe-area-inset-top)+8.5rem)] md:max-h-none md:w-72 md:overflow-visible md:text-xs md:leading-snug"
    : "absolute bottom-full right-0 mb-1 w-72 max-w-[calc(100vw_-_1rem)] text-left text-xs leading-snug text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.95)] lg:w-64";

  return (
    <details className={detailsClassName}>
      <summary className={summaryClassName}>
        Crédits photo
      </summary>
      <div className={contentClassName}>
        <p className="font-medium text-white/85">{credit.title}</p>
        <p className="mt-0.5 md:mt-px lg:mt-1">Photographie : {credit.creator}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-2 md:mt-px lg:mt-1">
          <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-white/50 underline-offset-2 hover:text-white">Source originale</a>
          {credit.licenseUrl && <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-white/50 underline-offset-2 hover:text-white">{credit.license}</a>}
        </p>
        <p className="mt-0.5 text-white/65 md:mt-px lg:mt-1">{credit.modification}</p>
      </div>
    </details>
  );
}
