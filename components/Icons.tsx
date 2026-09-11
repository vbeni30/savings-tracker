import type { ReactNode } from "react";
import type { IconKey } from "@/types";

type IconProps = {
  name: IconKey;
  className?: string;
};

const headsetPaths = (
  <>
    <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
    <path d="M3 14a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z" />
    <path d="M21 14a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2z" />
    <path d="M12 18v3" />
    <path d="M8 21h8" />
    <path d="M9 18h1.5a1.5 1.5 0 0 1 1.2 2.4L9 21" />
  </>
);

const handsetPaths = (
  <>
    <path d="M6.5 3.5a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L9.8 9.2a12 12 0 0 0 4 4l1.7-1.7a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L17 17.5a2 2 0 0 1-2.2.5 15.5 15.5 0 0 1-7.8-7.8 2 2 0 0 1 .5-2.2z" />
    <path d="M16 4l4 4" />
    <path d="M16 8l1-1" />
  </>
);

const paths: Record<IconKey, ReactNode> = {
  laptop: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </>
  ),
  headset: headsetPaths,
  handset: handsetPaths,
  ballot: headsetPaths,
  phone: handsetPaths,
  wallet: (
    <>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  moneybag: (
    <>
      <path d="M8 6h8l2 4-3 10H9L6 10z" />
      <path d="M9 6a3 3 0 0 1 6 0" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3 13.5 8.5 19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" />
      <path d="M5 3v3" />
      <path d="M3 5h3" />
      <path d="M19 17v3" />
      <path d="M17 19h3" />
    </>
  ),
};

export function Icon({ name, className }: IconProps) {
  const strokeWidth = name === "plus" ? 2.5 : 2;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name] ?? paths.moneybag}
    </svg>
  );
}
