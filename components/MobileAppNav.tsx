"use client";

import { NavIcon } from "@/components/NavIcon";
import type { MobileTabId } from "@/lib/mobile-tab";

export type { MobileTabId };

const TABS: { id: MobileTabId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "insights", label: "Insights" },
  { id: "plan", label: "Plan" },
  { id: "history", label: "Ledger" },
  { id: "coach", label: "Coach" },
];

type MobileAppNavProps = {
  active: MobileTabId;
  onSelect: (tab: MobileTabId) => void;
};

export function MobileAppNav({ active, onSelect }: MobileAppNavProps) {
  return (
    <nav className="mobile-app-nav app-tab-bar" aria-label="Main">
      {TABS.map((tab) => {
        const isActive = active === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            className={`mobile-nav-item${isActive ? " active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onSelect(tab.id)}
          >
            <span className="mobile-nav-icon">
              <NavIcon tab={tab.id} />
            </span>
            <span className="mobile-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
