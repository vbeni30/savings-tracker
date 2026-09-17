import { Icon } from "@/components/Icons";
import { formatAmount } from "@/lib/format";
import type { SourcePeriod, SourceSavings } from "@/types";

type SourceBreakdownProps = {
  title: string;
  rows: SourceSavings[];
  period: SourcePeriod;
  monthLabel?: string;
};

export function SourceBreakdown({ title, rows, period, monthLabel }: SourceBreakdownProps) {
  const totalSaved = rows.reduce((sum, row) => sum + row.saved, 0);
  const totalReceived = rows.reduce((sum, row) => sum + row.received, 0);
  const totalSavedAllTime = rows.reduce((sum, row) => sum + (row.savedAllTime ?? row.saved), 0);
  const currency = title.includes("Birr") ? "ETB" : "USD";

  if (rows.length === 0) return null;

  return (
    <div className="breakdown-group">
      <div className="breakdown-head">
        <h3>{title}</h3>
        <span className="mono breakdown-total">
          {formatAmount(totalSaved, currency)} saved
          {period === "month" ? " this month" : ""}
        </span>
      </div>
      {rows.map(({ rule, saved, received, share, savedAllTime, receivedAllTime }) => (
        <div key={rule.id} className="breakdown-row">
          <div className="breakdown-top">
            <span className={`breakdown-chip ${rule.cls}`}>
              <Icon name={rule.iconKey} />
            </span>
            <span className="breakdown-name">{rule.who}</span>
            <span className="breakdown-amt mono">{formatAmount(saved, rule.currency)}</span>
          </div>
          <div className="breakdown-meta mono">
            <span>
              Received {formatAmount(received, rule.currency)}
              {period === "month" ? " this month" : " logged"}
            </span>
            {received > 0 && <span>{Math.round((saved / received) * 100)}% to savings</span>}
          </div>
          {period === "month" && (savedAllTime !== undefined || receivedAllTime !== undefined) && (
            <div className="breakdown-compare mono">
              All time: {formatAmount(savedAllTime ?? 0, rule.currency)} saved ·{" "}
              {formatAmount(receivedAllTime ?? 0, rule.currency)} received
            </div>
          )}
          {saved > 0 && (
            <>
              <div className="breakdown-track" aria-hidden="true">
                <div
                  className={`breakdown-fill ${rule.cls}`}
                  style={{ width: `${Math.max(share, 8)}%` }}
                />
              </div>
              <span className="breakdown-share">{Math.round(share)}% of {currency} savings</span>
            </>
          )}
        </div>
      ))}
      {totalReceived > 0 && (
        <p className="breakdown-foot mono">
          {period === "month" ? `${monthLabel} · ` : ""}
          Received {formatAmount(totalReceived, currency)}
          {period === "month" && (
            <> · All time saved {formatAmount(totalSavedAllTime, currency)}</>
          )}
        </p>
      )}
    </div>
  );
}
