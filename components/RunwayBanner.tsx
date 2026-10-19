"use client";

import { formatRunwayLabel, type RunwayResult } from "@/lib/runway";

type RunwayBannerProps = {
  etb: RunwayResult;
  usd: RunwayResult;
};

export function RunwayBanner({ etb, usd }: RunwayBannerProps) {
  const showEtb = etb.spendable > 0 || etb.daysLeft === 0;
  const showUsd = usd.spendable > 0 || usd.daysLeft === 0;
  if (!showEtb && !showUsd) return null;

  return (
    <section className="block runway-banner" aria-label="Spendable runway">
      <h2 className="sec">Spendable runway</h2>
      <p className="sec-hint">
        Based on spendable expenses in the last {etb.lookbackDays} days (pace may change).
      </p>
      <div className="runway-grid">
        {showEtb && (
          <div className="runway-item">
            <span className="runway-currency">ETB</span>
            <span className="runway-value">{formatRunwayLabel(etb)}</span>
            {etb.dailyBurn !== null && (
              <span className="runway-meta mono">
                ~{Math.round(etb.dailyBurn).toLocaleString("en-US")}/day burn
              </span>
            )}
          </div>
        )}
        {showUsd && (
          <div className="runway-item">
            <span className="runway-currency">USD</span>
            <span className="runway-value">{formatRunwayLabel(usd)}</span>
            {usd.dailyBurn !== null && (
              <span className="runway-meta mono">
                ~${Math.round(usd.dailyBurn).toLocaleString("en-US")}/day burn
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
