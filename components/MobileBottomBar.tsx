"use client";

import { Icon } from "@/components/Icons";

type MobileBottomBarProps = {
  onLogPayday: () => void;
  onExpense: () => void;
};

export function MobileBottomBar({ onLogPayday, onExpense }: MobileBottomBarProps) {
  return (
    <nav className="mobile-bottom-bar" aria-label="Quick actions">
      <button type="button" className="mobile-bar-btn secondary" onClick={onExpense}>
        Expense
      </button>
      <button type="button" className="mobile-bar-btn primary" onClick={onLogPayday}>
        <Icon name="plus" />
        Log payday
      </button>
    </nav>
  );
}
