"use client";

import { useFxRates } from "@/hooks/useFxRates";

type FxRatesSectionProps = {
  savedUsd: number;
  spendableUsd: number;
};

function formatRate(value: number): string {
  if (value >= 100) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function FxRatesSection({ savedUsd, spendableUsd }: FxRatesSectionProps) {
  const { rates, error, loading } = useFxRates();
  const totalUsd = savedUsd + spendableUsd;

  return (
    <section className="block" aria-labelledby="fx-rates-title">
      <h2 id="fx-rates-title" className="sec">
        USD exchange rates
      </h2>
      <p className="sec-hint">Live USD cross-rates (ETB, GBP, EUR). Refreshes about hourly.</p>

      <div className="fx-section-card">
        {loading && <p className="fx-loading">Loading rates…</p>}

        {!loading && (error || !rates) && (
          <p className="fx-error">{error ?? "Could not load rates"}</p>
        )}

        {!loading && rates && (
          <>
            <div className="fx-rate-grid">
              {(
                [
                  ["ETB", rates.rates.ETB],
                  ["GBP", rates.rates.GBP],
                  ["EUR", rates.rates.EUR],
                ] as const
              ).map(([code, rate]) => (
                <div key={code} className="fx-rate-cell">
                  <span className="fx-rate-code">{code}</span>
                  <span className="fx-rate-value mono">1 USD = {formatRate(rate)}</span>
                </div>
              ))}
            </div>

            {totalUsd > 0 && (
              <div className="fx-holdings">
                <p className="fx-holdings-title">
                  Your ${totalUsd.toLocaleString("en-US")} (saved + spendable)
                </p>
                <ul className="fx-holdings-list mono">
                  <li>
                    <span>ETB</span>
                    <span>{Math.round(totalUsd * rates.rates.ETB).toLocaleString("en-US")}</span>
                  </li>
                  <li>
                    <span>GBP</span>
                    <span>{formatRate(totalUsd * rates.rates.GBP)}</span>
                  </li>
                  <li>
                    <span>EUR</span>
                    <span>{formatRate(totalUsd * rates.rates.EUR)}</span>
                  </li>
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
