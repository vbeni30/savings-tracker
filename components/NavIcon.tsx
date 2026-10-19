import type { MobileTabId } from "@/lib/mobile-tab";

type NavIconProps = {
  tab: MobileTabId;
  className?: string;
};

export function NavIcon({ tab, className }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      {tab === "home" && (
        <path d="M19 7H18V6a3 3 0 0 0-6 0v1H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Zm-8-1a1 1 0 0 1 2 0v1h-2V6Zm6 14H7V9h10v11Zm-2-4a1 1 0 1 1-2 0v-3a1 1 0 1 1 2 0v3Z" />
      )}
      {tab === "insights" && (
        <>
          <rect x="5" y="12" width="4" height="8" rx="1" />
          <rect x="10" y="8" width="4" height="12" rx="1" />
          <rect x="15" y="5" width="4" height="15" rx="1" />
        </>
      )}
      {tab === "plan" && (
        <path d="M12 2a5 5 0 0 0-5 5v2.1c0 .9-.3 1.8-.9 2.5L4.3 14a1 1 0 0 0 .8 1.6h5.4A3 3 0 0 0 12 19a3 3 0 0 0 1.5 2.4h5.4a1 1 0 0 0 .8-1.6l-1.8-2.4a3.6 3.6 0 0 1-.9-2.5V7a5 5 0 0 0-5-5Zm0 18a1 1 0 0 1-1-1h2a1 1 0 0 1-1 1Z" />
      )}
      {tab === "history" && (
        <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6Zm2 4h8a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2Zm0 5h8a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2Zm0 5h5a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2Z" />
      )}
      {tab === "coach" && (
        <path d="m12 2 1.8 5.5h5.7l-4.6 3.4 1.8 5.5L12 13l-4.7 3.4 1.8-5.5L4.5 7.5h5.7L12 2Zm-7.2-.5 1.4 1.4-1.4 1.4-1.4-1.4 1.4-1.4Zm14.4 0 1.4 1.4-1.4 1.4-1.4-1.4 1.4-1.4ZM4.3 17.1l1.4 1.4-1.4 1.4-1.4-1.4 1.4-1.4Zm15.4 0 1.4 1.4-1.4 1.4-1.4-1.4 1.4-1.4Z" />
      )}
    </svg>
  );
}
