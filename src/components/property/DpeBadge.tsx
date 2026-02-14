import { cn } from "@/lib/utils";

const dpeColors: Record<string, string> = {
  A: "bg-dpe-a text-white",
  B: "bg-dpe-b text-white",
  C: "bg-dpe-c text-foreground",
  D: "bg-dpe-d text-foreground",
  E: "bg-dpe-e text-white",
  F: "bg-dpe-f text-white",
  G: "bg-dpe-g text-white",
};

interface DpeBadgeProps {
  label: string;
  size?: "sm" | "md";
  type?: "DPE" | "GES";
}

const DpeBadge = ({ label, size = "md", type = "DPE" }: DpeBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded font-bold",
        dpeColors[label] || "bg-muted text-muted-foreground",
        size === "sm" ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-xs"
      )}
      title={`${type} : ${label}`}
    >
      {label}
    </span>
  );
};

export default DpeBadge;
