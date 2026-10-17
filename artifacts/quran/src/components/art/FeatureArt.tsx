import { useId, type ReactNode } from "react";

// Large feature artwork for tiles. Two tracks share one slot:
//  1. 3D renders in `src/assets/feature-art/<name>.webp` (or .png) are used
//     automatically (see README there; rendered by tools/feature-art).
//  2. The layered SVG drawings below are the fallback for any name without a file.

export type FeatureArtName =
  | "morning"
  | "evening"
  | "sleep"
  | "post-prayer"
  | "istighfar"
  | "praise"
  | "salah-nabi"
  | "istiazah"
  | "tasbeeh"
  | "quran"
  | "khatmah";

const assets = import.meta.glob<string>("../../assets/feature-art/*.{webp,png}", {
  eager: true,
  import: "default",
});

function assetFor(name: FeatureArtName): string | undefined {
  return assets[`../../assets/feature-art/${name}.webp`] ?? assets[`../../assets/feature-art/${name}.png`];
}

export function hasFeatureAsset(name: FeatureArtName): boolean {
  return !!assetFor(name);
}

interface Props {
  name: FeatureArtName;
  size?: number;
  className?: string;
}

export default function FeatureArt({ name, size = 112, className = "" }: Props) {
  const src = assetFor(name);
  if (src) {
    return (
      <img
        src={src}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        decoding="async"
        draggable={false}
        className={`feature-art ${className}`}
        data-art={name}
        data-art-source="asset"
      />
    );
  }
  return (
    <span className={`feature-art ${className}`} data-art={name} data-art-source="placeholder" aria-hidden="true">
      <Placeholder name={name} size={size} />
    </span>
  );
}

// ── Layered SVG placeholders ─────────────────────────────────────────────────
// One material family: brushed gold and warm ivory, lit from the top-left,
// with a soft contact shadow. No lettering or script is drawn.

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-gold`} x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0" stopColor="#FBEBB5" />
        <stop offset="0.38" stopColor="#E3BE62" />
        <stop offset="0.72" stopColor="#B8892F" />
        <stop offset="1" stopColor="#8A631C" />
      </linearGradient>
      <radialGradient id={`${id}-goldBall`} cx="0.36" cy="0.32" r="0.75">
        <stop offset="0" stopColor="#FFF4CC" />
        <stop offset="0.35" stopColor="#EBC66A" />
        <stop offset="0.8" stopColor="#B08029" />
        <stop offset="1" stopColor="#7E5916" />
      </radialGradient>
      <linearGradient id={`${id}-ivory`} x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0" stopColor="#FFFDF6" />
        <stop offset="0.6" stopColor="#EFE6D0" />
        <stop offset="1" stopColor="#CDBF9E" />
      </linearGradient>
      <linearGradient id={`${id}-jade`} x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0" stopColor="#7FD6A8" />
        <stop offset="0.45" stopColor="#2F9B66" />
        <stop offset="1" stopColor="#135C3A" />
      </linearGradient>
      <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <radialGradient id={`${id}-shadow`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#000" stopOpacity="0.38" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#04140C" floodOpacity="0.35" />
      </filter>
    </defs>
  );
}

function Star8({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const s = r * 0.72;
  return (
    <g>
      <rect x={cx - s} y={cy - s} width={s * 2} height={s * 2} rx={r * 0.08} fill={fill} />
      <rect x={cx - s} y={cy - s} width={s * 2} height={s * 2} rx={r * 0.08} fill={fill} transform={`rotate(45 ${cx} ${cy})`} />
    </g>
  );
}

function Spark({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  return (
    <path
      d={`M${cx} ${cy - r} Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy} Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r} Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy} Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r}Z`}
      fill={fill}
    />
  );
}

function art(name: FeatureArtName, id: string): ReactNode {
  const gold = `url(#${id}-gold)`;
  const ball = `url(#${id}-goldBall)`;
  const ivory = `url(#${id}-ivory)`;
  const jade = `url(#${id}-jade)`;
  const shine = `url(#${id}-shine)`;
  const soft = `url(#${id}-soft)`;
  switch (name) {
    case "morning":
      return (
        <g filter={soft}>
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x="57" y="14" width="6" height="16" rx="3" fill={gold} transform={`rotate(${i * 30} 60 58)`} />
          ))}
          <circle cx="60" cy="58" r="25" fill={ball} />
          <ellipse cx="52" cy="47" rx="11" ry="6" fill={shine} opacity="0.8" />
        </g>
      );
    case "evening":
      return (
        <g>
          <g filter={soft}>
            <path d="M74 22a32 32 0 1 0 20 52A26 26 0 1 1 74 22z" fill={ball} />
            <ellipse cx="52" cy="38" rx="9" ry="5" fill={shine} opacity="0.7" transform="rotate(-30 52 38)" />
          </g>
          <rect x="18" y="86" width="84" height="5" rx="2.5" fill={ivory} opacity="0.85" />
          <rect x="30" y="96" width="60" height="4" rx="2" fill={ivory} opacity="0.55" />
          <rect x="42" y="105" width="36" height="3" rx="1.5" fill={ivory} opacity="0.35" />
        </g>
      );
    case "sleep":
      return (
        <g filter={soft}>
          <path d="M66 18a38 38 0 1 0 34 58A31 31 0 1 1 66 18z" fill={ball} />
          <ellipse cx="44" cy="40" rx="9" ry="5" fill={shine} opacity="0.7" transform="rotate(-40 44 40)" />
          <Spark cx={92} cy={30} r={9} fill={ivory} />
          <Spark cx={102} cy={52} r={5} fill={ivory} />
          <Spark cx={80} cy={46} r={4} fill={ivory} />
        </g>
      );
    case "post-prayer":
      return (
        <g filter={soft}>
          <rect x="16" y="40" width="10" height="64" rx="3" fill={ivory} />
          <path d="M21 22l7 14H14z" fill={gold} />
          <rect x="94" y="40" width="10" height="64" rx="3" fill={ivory} />
          <path d="M99 22l7 14H92z" fill={gold} />
          <path d="M32 104V74c0-18 12-30 28-38 16 8 28 20 28 38v30z" fill={ivory} />
          <path d="M60 36c-9 5-16 12-20 20h40c-4-8-11-15-20-20z" fill={shine} opacity="0.5" />
          <path d="M60 36V24" stroke={gold} strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="21" r="4" fill={gold} />
          <path d="M52 104V88a8 8 0 0 1 16 0v16z" fill={jade} />
          <rect x="26" y="102" width="68" height="6" rx="3" fill={gold} />
        </g>
      );
    case "salah-nabi":
      return (
        <g filter={soft}>
          <rect x="22" y="78" width="76" height="26" rx="4" fill={ivory} />
          <path d="M30 80c0-22 13-38 30-44 17 6 30 22 30 44z" fill={jade} />
          <path d="M60 36c-12 4-21 14-25 26h22c1-10 2-19 3-26z" fill={shine} opacity="0.35" />
          <path d="M60 36V22" stroke={gold} strokeWidth="3" strokeLinecap="round" />
          <path d="M66 14a7 7 0 1 0 0 10 5.5 5.5 0 1 1 0-10z" fill={gold} />
          <rect x="22" y="76" width="76" height="5" rx="2.5" fill={gold} />
          {[34, 50, 66, 82].map((x) => (
            <path key={x} d={`M${x} 104v-12a4 4 0 0 1 8 0v12z`} fill={jade} opacity="0.8" />
          ))}
        </g>
      );
    case "istighfar":
      return (
        <g filter={soft}>
          <path d="M60 14C48 34 32 50 32 72a28 28 0 0 0 56 0c0-22-16-38-28-58z" fill={jade} />
          <path d="M60 14C48 34 32 50 32 72a28 28 0 0 0 56 0c0-22-16-38-28-58z" fill="none" stroke={gold} strokeWidth="2.5" opacity="0.9" />
          <ellipse cx="48" cy="62" rx="7" ry="13" fill={shine} opacity="0.65" transform="rotate(20 48 62)" />
          <circle cx="68" cy="84" r="4" fill="#fff" opacity="0.35" />
        </g>
      );
    case "praise":
      return (
        <g filter={soft}>
          <Star8 cx={60} cy={60} r={42} fill={gold} />
          <Star8 cx={60} cy={60} r={30} fill={ivory} />
          <circle cx="60" cy="60" r="14" fill={ball} />
          <ellipse cx="54" cy="54" rx="6" ry="3.5" fill={shine} opacity="0.8" />
        </g>
      );
    case "istiazah":
      return (
        <g filter={soft}>
          <path d="M60 14l38 14v28c0 26-17 42-38 50-21-8-38-24-38-50V28z" fill={gold} />
          <path d="M60 24l28 10v22c0 20-12 32-28 39-16-7-28-19-28-39V34z" fill={jade} />
          <Star8 cx={60} cy={58} r={15} fill={ivory} />
          <path d="M60 24l-28 10v8c10-4 20-8 28-18z" fill={shine} opacity="0.35" />
        </g>
      );
    case "tasbeeh":
      return (
        <g filter={soft}>
          {Array.from({ length: 15 }).map((_, i) => {
            const a = (Math.PI * 2 * i) / 16 - Math.PI / 2 + Math.PI / 16;
            const cx = 60 + Math.cos(a) * 36;
            const cy = 52 + Math.sin(a) * 34;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="7.2" fill={ball} />
                <circle cx={cx - 2.2} cy={cy - 2.4} r="2.2" fill="#fff" opacity="0.7" />
              </g>
            );
          })}
          <circle cx="60" cy="90" r="8" fill={jade} />
          <path d="M56 97h8l3 15H53z" fill={gold} />
        </g>
      );
    case "quran":
    case "khatmah":
      return (
        <g filter={soft}>
          <path d="M60 36c-12-8-28-10-44-8v58c16-2 32 0 44 8z" fill={ivory} />
          <path d="M60 36c12-8 28-10 44-8v58c-16-2-32 0-44 8z" fill={ivory} />
          <path d="M60 36v58" stroke="#B8892F" strokeWidth="2" />
          <path d="M14 26c18-3 34 0 46 8 12-8 28-11 46-8v6c-18-3-34 0-46 8-12-8-28-11-46-8z" fill={gold} />
          <path d="M30 100l30-14 30 14-6 6-24-11-24 11z" fill={gold} />
          {name === "khatmah" && <circle cx="96" cy="26" r="11" fill={jade} stroke={gold} strokeWidth="2" />}
        </g>
      );
  }
}

function Placeholder({ name, size }: { name: FeatureArtName; size: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <Defs id={id} />
      <ellipse cx="60" cy="112" rx="38" ry="6" fill={`url(#${id}-shadow)`} />
      {art(name, id)}
    </svg>
  );
}
