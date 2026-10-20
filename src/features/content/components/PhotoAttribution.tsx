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
    <details className="group absolute bottom-1 right-1 z-20 text-right text-white">
      <summary className="inline-flex min-h-6 cursor-pointer list-none items-center rounded-sm bg-black/45 px-1.5 py-1 text-[9px] font-medium leading-none underline decoration-white/50 underline-offset-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] transition-colors hover:bg-black/65 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/80 [&::-webkit-details-marker]:hidden">
        Crédits photo
      </summary>
      <div className="absolute bottom-full right-0 mb-1 w-64 rounded-sm bg-black/85 p-2.5 text-left text-[10px] leading-snug text-white shadow-lg">
        <p className="font-medium">{credit.title}</p>
        <p className="mt-1">Photographie : {credit.creator}</p>
        <p className="mt-1 flex flex-wrap gap-x-2">
          <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Source originale</a>
          {credit.licenseUrl && <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{credit.license}</a>}
        </p>
        <p className="mt-1 text-white/75">{credit.modification}</p>
      </div>
    </details>
  );
}
