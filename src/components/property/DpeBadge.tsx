import type { EnergyLabel } from "@/types/domain";

const scale = [
  { label: "A", color: "#07976f", width: 44 },
  { label: "B", color: "#47a64f", width: 49 },
  { label: "C", color: "#a9c929", width: 54 },
  { label: "D", color: "#f0d52a", width: 59 },
  { label: "E", color: "#f3a51e", width: 64 },
  { label: "F", color: "#ec6d22", width: 69 },
  { label: "G", color: "#d94236", width: 74 },
] satisfies Array<{ label: EnergyLabel; color: string; width: number }>;

interface DpeBadgeProps {
  label: EnergyLabel | string | null;
  size?: "sm" | "md";
  type?: "DPE" | "GES";
  value?: number | null;
}

export default function DpeBadge({ label, size = "md", type = "DPE", value }: DpeBadgeProps) {
  const selectedClass = scale.some((item) => item.label === label) ? label : null;
  const accessibleValue = value == null ? "" : `, ${value} ${type === "DPE" ? "kilowattheures par mètre carré et par an" : "kilogrammes de CO₂ par mètre carré et par an"}`;

  if (!selectedClass) {
    return (
      <span className="inline-flex h-10 items-center rounded border border-border px-2 text-xs text-muted-foreground" aria-label={`${type} non renseigné`}>
        {type} N.C.
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-center gap-0.5" role="img" aria-label={`${type}, classe ${selectedClass}${accessibleValue}`} title={`${type} ${selectedClass}${value == null ? "" : ` · ${value} ${type === "DPE" ? "kWh/m².an" : "kgCO₂/m².an"}`}`}>
      <svg
        viewBox="0 0 96 84"
        width={size === "sm" ? 56 : 68}
        height={size === "sm" ? 50 : 60}
        aria-hidden="true"
        focusable="false"
      >
        <title>{`${type}, classe ${selectedClass}`}</title>
        {scale.map((item, index) => {
          const y = 2 + index * 11.5;
          const selected = item.label === selectedClass;
          return (
            <g key={item.label} opacity={selected ? 1 : 0.74}>
              <rect
                x="3"
                y={y}
                width={item.width}
                height="9"
                rx="1.3"
                fill={item.color}
                stroke={selected ? "#17231f" : "none"}
                strokeWidth={selected ? "1.1" : "0"}
              />
              <text x="7" y={y + 6.7} fill={index === 2 || index === 3 ? "#17231f" : "#fff"} fontSize="6.7" fontWeight="800">
                {item.label}
              </text>
              {selected && <path d={`M${item.width + 5} ${y + 1} l5 3.5 -5 3.5 z`} fill="#17231f" />}
            </g>
          );
        })}
      </svg>
      <span className="text-[9px] font-semibold leading-none tracking-wide text-foreground">{type} {selectedClass}</span>
    </span>
  );
}
