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
      className="absolute bottom-1 right-1 z-20 inline-flex min-h-5 items-center px-0.5 py-1 text-[7px] font-medium leading-none text-white/80 underline decoration-white/50 underline-offset-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] transition-opacity hover:text-white hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/80"
    >
      Crédits
    </a>
  );
}
