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
    <a
      href={credit.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Crédits photo : ${credit.title}`}
      className="absolute bottom-2 right-2 z-20 inline-flex min-h-5 items-center rounded-sm bg-black/65 px-1.5 py-1 text-[9px] font-medium leading-none text-white underline decoration-white/75 underline-offset-2 shadow-sm transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      Crédits
    </a>
  );
}
