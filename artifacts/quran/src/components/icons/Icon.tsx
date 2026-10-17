import type { SVGProps } from "react";

// One line-icon family for the whole app: 24px grid, 1.75 stroke, round caps.
// Feature artwork (large tiles) lives in components/art instead.

const paths = {
  book: (
    <>
      <path d="M12 6.5C10.2 5 7.6 4.3 4 4.5v13c3.6-.2 6.2.5 8 2 1.8-1.5 4.4-2.2 8-2v-13c-3.6-.2-6.2.5-8 2z" />
      <path d="M12 6.5v13" />
    </>
  ),
  star8: (
    <>
      <path d="M12 2.8l2.6 3.1 4-.4-.4 4 3.1 2.5-3.1 2.6.4 4-4-.4L12 21.2l-2.6-3-4 .4.4-4-3.1-2.6 3.1-2.5-.4-4 4 .4z" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  mosque: (
    <>
      <path d="M7 20v-6.5C7 10.5 9.4 8.6 12 7c2.6 1.6 5 3.5 5 6.5V20" />
      <path d="M12 7V4.5M12 4.5a1 1 0 100-.01" />
      <path d="M3.5 20V10.5l1.25-2 1.25 2V20M18 20v-9.5l1.25-2 1.25 2V20" />
      <path d="M2.5 20h19M10.5 20v-3.2a1.5 1.5 0 013 0V20" />
    </>
  ),
  list: (
    <>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <circle cx="4.75" cy="6.5" r="1.1" />
      <circle cx="4.75" cy="12" r="1.1" />
      <circle cx="4.75" cy="17.5" r="1.1" />
    </>
  ),
  more: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  search: (
    <>
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="M20 20l-4.25-4.25" />
    </>
  ),
  bookmark: <path d="M6.5 3.5h11a1 1 0 011 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 011-1z" />,
  bookmarkPlus: (
    <>
      <path d="M6.5 3.5h11a1 1 0 011 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 011-1z" />
      <path d="M12 7.5v5M9.5 10h5" />
    </>
  ),
  pin: (
    <>
      <path d="M5 4h14v16l-7-5-7 5z" />
      <path d="M9 8.5h6" />
    </>
  ),
  share: (
    <>
      <path d="M12 3.5v11M8 7.5l4-4 4 4" />
      <path d="M7 11H5.5a1 1 0 00-1 1v7.5a1 1 0 001 1h13a1 1 0 001-1V12a1 1 0 00-1-1H17" />
    </>
  ),
  chevronStart: <path d="M9 5l7 7-7 7" />,
  chevronEnd: <path d="M15 5l-7 7 7 7" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 10-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15.5 18 9z" />
      <path d="M10.3 20.5a1.9 1.9 0 003.4 0" />
    </>
  ),
  bellOff: (
    <>
      <path d="M18 9a6 6 0 00-9.5-4.9M6.2 7.6C6.07 8.06 6 8.52 6 9c0 6.5-2.5 8.5-2.5 8.5H17" />
      <path d="M10.3 20.5a1.9 1.9 0 003.4 0M3 3l18 18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M8 12.3l2.7 2.7L16 9.7" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />,
  refresh: (
    <>
      <path d="M4 12a8 8 0 0113.7-5.6L20 8.5" />
      <path d="M20 4v4.5h-4.5M20 12a8 8 0 01-13.7 5.6L4 15.5" />
      <path d="M4 20v-4.5h4.5" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 11v5.5M12 7.75v.01" />
    </>
  ),
  textSize: (
    <>
      <path d="M3 18.5L7.5 6l4.5 12.5M4.6 14.5h5.8" />
      <path d="M14 18.5l3.5-9 3.5 9M15.2 15.5h4.6" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5V5.5a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2h3" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s7-6.2 7-11.5a7 7 0 10-14 0C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  beads: (
    <>
      <circle cx="12" cy="4.5" r="1.6" />
      <circle cx="17.3" cy="6.7" r="1.6" />
      <circle cx="19.5" cy="12" r="1.6" />
      <circle cx="17.3" cy="17.3" r="1.6" />
      <circle cx="6.7" cy="6.7" r="1.6" />
      <circle cx="4.5" cy="12" r="1.6" />
      <circle cx="6.7" cy="17.3" r="1.6" />
      <path d="M12 18.5v3M10.5 21.5h3" />
    </>
  ),
  tafsir: (
    <>
      <path d="M5 4.5h10.5L19 8v11.5a1 1 0 01-1 1H5a1 1 0 01-1-1v-14a1 1 0 011-1z" />
      <path d="M15 4.5V8.5h4M7.5 12h9M7.5 15.5h6" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 100 17c1.2 0 1.8-.8 1.8-1.7 0-1.4-1.1-1.6-1.1-2.7 0-.9.7-1.6 1.6-1.6h2.2A3.5 3.5 0 0020 11c0-4.2-3.6-7.5-8-7.5z" />
      <circle cx="7.5" cy="11.5" r="1" />
      <circle cx="10" cy="7.5" r="1" />
      <circle cx="14.5" cy="7.5" r="1" />
    </>
  ),
  rateStar: <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />,
  undo: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 010 11H11" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12.5a1.5 1.5 0 001.5 1.5h8a1.5 1.5 0 001.5-1.5L18.5 7M9 7V4.5h6V7" />
    </>
  ),
} as const;

export type IconName = keyof typeof paths;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 24, filled = false, strokeWidth = 1.75, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
