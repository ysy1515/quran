import { useId } from "react";

// مصحفك brand mark: an open Mushaf under a Rub el Hizb (the quarter-hizb mark
// printed in every Mushaf), with a bookmark ribbon. Masters and the brand brief
// are in docs/brand/. No lettering is drawn as shapes; the name is typeset.

export const BRAND = {
  name: "مصحفك",
  tagline: "مصحفك معك",
  storeTitle: "مصحفك – القرآن الكريم والأذكار",
} as const;

function star8(cx: number, cy: number, r: number, inner = 0.765) {
  return Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 8;
    const rr = i % 2 ? r * inner : r;
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

const PAGE_LINES = [0, 1, 2];

/** The symbol alone. `tone="gold"` for dark backgrounds, `"green"` for light ones. */
export function BrandSymbol({ size = 48, tone = "gold", lines = true }: { size?: number; tone?: "gold" | "green"; lines?: boolean }) {
  const id = useId().replace(/:/g, "");
  const gold = `url(#${id}-gold)`;
  const cover = tone === "gold" ? gold : "#0B3D2A";
  const page = tone === "gold" ? "#F6F0E1" : "#FFFFFF";
  const star = tone === "gold" ? gold : "#0B3D2A";
  const ribbon = tone === "gold" ? "#F1D894" : "#D6AE5C";
  return (
    <svg width={size} height={size * 0.92} viewBox="0 6 100 92" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#F1D894" />
          <stop offset="0.55" stopColor="#D6AE5C" />
          <stop offset="1" stopColor="#A97C2F" />
        </linearGradient>
      </defs>
      <path d="M50 78 C42 72 30 69 17 70 L17 38 C30 37 42 40 50 46 Z" fill={page} />
      <path d="M50 78 C58 72 70 69 83 70 L83 38 C70 37 58 40 50 46 Z" fill={page} />
      {lines &&
        PAGE_LINES.map((i) => (
          <g key={i} stroke="#D6AE5C" strokeOpacity="0.55" strokeWidth="1.1" fill="none" strokeLinecap="round">
            <path d={`M23 ${50 + i * 6} C32 ${49.5 + i * 6} 40 ${51.5 + i * 6} 46 ${54.5 + i * 6}`} />
            <path d={`M77 ${50 + i * 6} C68 ${49.5 + i * 6} 60 ${51.5 + i * 6} 54 ${54.5 + i * 6}`} />
          </g>
        ))}
      <path d="M50 82 C41 76 28 73 13 74 L13 42 L17 41.5 L17 70 C30 69 42 72 50 78 Z" fill={cover} />
      <path d="M50 82 C59 76 72 73 87 74 L87 42 L83 41.5 L83 70 C70 69 58 72 50 78 Z" fill={cover} />
      <path d="M50 46 L50 78" stroke="#A97C2F" strokeWidth="1" strokeOpacity="0.6" />
      <path d="M46.6 79 L53.4 79 L53.4 94 L50 90.6 L46.6 94 Z" fill={ribbon} />
      <polygon points={star8(50, 25, 11.5)} fill={star} />
      <polygon points={star8(50, 25, 5.2)} fill="#0B3D2A" opacity="0.9" />
    </svg>
  );
}

/** The app icon: the gold symbol on the deep-green tile, as on the home screen. */
export function BrandIcon({ size = 64 }: { size?: number }) {
  return (
    <span
      className="inline-grid place-items-center flex-none shadow-[0_6px_18px_rgba(6,42,28,0.28)]"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2237,
        background: "radial-gradient(circle at 50% 32%, #145A3E 0%, #0B3D2A 55%, #062A1C 100%)",
      }}
    >
      <BrandSymbol size={size * 0.78} />
    </span>
  );
}

/** App icon with the typeset name and, optionally, the tagline. */
export function BrandLockup({
  size = 64,
  tone = "gold",
  stacked = false,
  tagline = true,
  className = "",
}: {
  size?: number;
  tone?: "gold" | "green";
  stacked?: boolean;
  tagline?: boolean;
  className?: string;
}) {
  const nameColor = tone === "gold" ? "text-[#D6AE5C]" : "text-[#0B3D2A] dark:text-[#D6AE5C]";
  return (
    <div className={`flex ${stacked ? "flex-col" : "flex-row"} items-center gap-3 ${className}`} data-testid="brand-lockup">
      <BrandIcon size={size} />
      <div className={stacked ? "text-center" : ""}>
        <p className={`brand-wordmark ${nameColor}`} style={{ fontSize: size * 0.62 }}>
          {BRAND.name}
        </p>
        {tagline && <p className="text-sm font-semibold opacity-80 mt-0.5">{BRAND.tagline}</p>}
      </div>
    </div>
  );
}
