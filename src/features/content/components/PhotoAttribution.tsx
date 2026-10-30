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
};

export function PhotoAttribution({ credit }: PhotoAttributionProps) {
  return (
    <details className="group absolute bottom-1 right-1 z-20 text-right text-white/70">
      <summary className="inline-flex min-h-6 cursor-pointer list-none items-center px-1 py-1 text-xs font-normal leading-none underline decoration-white/35 underline-offset-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] transition-colors hover:text-white/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/70 [&::-webkit-details-marker]:hidden">
        Crédits photo
      </summary>
      <div className="absolute bottom-full right-0 mb-1 w-72 max-w-[calc(100vw_-_1rem)] text-left text-xs leading-snug text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.95)] lg:w-64">
        <p className="font-medium text-white/85">{credit.title}</p>
        <p className="mt-px lg:mt-1">Photographie : {credit.creator}</p>
        <p className="mt-px flex flex-wrap gap-x-2 lg:mt-1">
          <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-white/50 underline-offset-2 hover:text-white">Source originale</a>
          {credit.licenseUrl && <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-white/50 underline-offset-2 hover:text-white">{credit.license}</a>}
        </p>
        <p className="mt-px text-white/65 lg:mt-1">{credit.modification}</p>
      </div>
    </details>
  );
}
