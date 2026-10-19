"use client";

import { Icon } from "@/components/Icons";

type EmptyLedgerOnboardingProps = {
  onOpeningBalances: () => void;
  onImport: () => void;
  onLogPayday: () => void;
};

export function EmptyLedgerOnboarding({
  onOpeningBalances,
  onImport,
  onLogPayday,
}: EmptyLedgerOnboardingProps) {
  return (
    <section className="block onboarding-card" aria-labelledby="onboarding-title">
      <h2 id="onboarding-title" className="sec">
        Get started
      </h2>
      <p className="sec-hint">
        Your ledger is empty. Pick one path — you can always import a backup or log paydays later.
      </p>
      <div className="onboarding-actions">
        <button type="button" className="onboarding-btn" onClick={onOpeningBalances}>
          <Icon name="wallet" />
          Set opening balances
        </button>
        <button type="button" className="onboarding-btn" onClick={onImport}>
          <Icon name="download" />
          Import backup JSON
        </button>
        <button type="button" className="onboarding-btn primary" onClick={onLogPayday}>
          <Icon name="plus" />
          Log first payday
        </button>
      </div>
    </section>
  );
}
