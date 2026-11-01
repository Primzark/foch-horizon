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
  placement?: "default" | "below-search-controls";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onBeforeOpen?: () => void;
};

export function PhotoAttribution({
  credit,
  placement = "default",
  open = false,
  onOpenChange,
  onBeforeOpen,
}: PhotoAttributionProps) {
  const summaryClassName = "inline-flex min-h-6 cursor-pointer list-none items-center px-1 py-1 text-xs font-normal leading-none underline decoration-white/35 underline-offset-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] transition-colors hover:text-white/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/70 [&::-webkit-details-marker]:hidden";
  const creditContent = (
    <>
      <p className="font-medium text-white/85">{credit.title}</p>
      <p className="mt-0.5">Photographie : {credit.creator}</p>
      <p className="mt-0.5 flex flex-wrap gap-x-2">
        <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-white/50 underline-offset-2 hover:text-white">Source originale</a>
        {credit.licenseUrl && <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-white/50 underline-offset-2 hover:text-white">{credit.license}</a>}
      </p>
      <p className="mt-0.5 text-white/65">{credit.modification}</p>
    </>
  );

  if (placement === "below-search-controls") {
    return (
      <div className="relative z-50 mt-1 ml-auto w-fit text-right text-white/70">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            if (!open) onBeforeOpen?.();
            onOpenChange?.(!open);
          }}
          className={summaryClassName}
        >
          Crédits photo
        </button>
        {open && (
          <div className="absolute right-0 top-full z-[70] mt-1 max-h-[min(10rem,40vh)] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-white/20 bg-slate-950/90 p-2 text-left text-[10px] leading-tight text-white/95 shadow-lg backdrop-blur-sm sm:text-xs sm:leading-snug">
            {creditContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <details className="group absolute bottom-1 right-1 z-20 text-right text-white/70">
      <summary className={summaryClassName}>
        Crédits photo
      </summary>
      <div className="absolute bottom-full right-0 mb-1 w-72 max-w-[calc(100vw_-_1rem)] text-left text-xs leading-snug text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.95)] lg:w-64">
        {creditContent}
      </div>
    </details>
  );
}
