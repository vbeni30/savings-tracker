"use client";

import { formatPercent } from "@/lib/format";
import type { MonthlyRecap } from "@/lib/monthly-recap";

type MonthlyRecapCardProps = {
  recap: MonthlyRecap;
};

export function MonthlyRecapCard({ recap }: MonthlyRecapCardProps) {
  const hasActivity =
    recap.savedAdded.etb > 0 ||
    recap.savedAdded.usd > 0 ||
    recap.spendableSpent.etb > 0 ||
    recap.spendableSpent.usd > 0 ||
    recap.paydaysLogged > 0;

  return (
    <section className="block recap-card">
      <h2 className="sec">Monthly recap</h2>
      <p className="period-note mono">{recap.monthLabel}</p>
      {!hasActivity ? (
        <p className="recap-empty">No activity logged this month yet.</p>
      ) : (
        <div className="recap-grid">
          <div className="recap-stat">
            <span className="recap-label">Saved (ETB)</span>
            <b className="mono">{recap.savedAdded.etb.toLocaleString("en-US")}</b>
            <span className="recap-sub">
              Plan ~{Math.round(recap.plannedSave.etb).toLocaleString("en-US")} · rate{" "}
              {formatPercent(recap.saveRateEtb)}
            </span>
          </div>
          <div className="recap-stat">
            <span className="recap-label">Saved (USD)</span>
            <b className="mono">${recap.savedAdded.usd.toLocaleString("en-US")}</b>
            <span className="recap-sub">
              Plan ~${Math.round(recap.plannedSave.usd).toLocaleString("en-US")} · rate{" "}
              {formatPercent(recap.saveRateUsd)}
            </span>
          </div>
          <div className="recap-stat">
            <span className="recap-label">Spendable spent</span>
            <b className="mono">
              {recap.spendableSpent.etb.toLocaleString("en-US")} ETB · $
              {recap.spendableSpent.usd.toLocaleString("en-US")}
            </b>
          </div>
          <div className="recap-stat">
            <span className="recap-label">Paydays logged</span>
            <b className="mono">
              {recap.paydaysLogged} / {recap.plannedPaydays} scheduled
            </b>
          </div>
        </div>
      )}
    </section>
  );
}
