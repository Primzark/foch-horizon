import { cn } from "@/lib/utils";

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
  className?: string;
};

export function PhotoAttribution({ credit, className }: PhotoAttributionProps) {
  return (
    <p className={cn("text-[10px] leading-relaxed", className)}>
      <a href={credit.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
        « {credit.title} »
      </a>
      <span> · {credit.creator} · </span>
      {credit.licenseUrl ? (
        <a href={credit.licenseUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {credit.license}
        </a>
      ) : (
        <span>{credit.license}</span>
      )}
      <span> · {credit.modification}</span>
    </p>
  );
}
