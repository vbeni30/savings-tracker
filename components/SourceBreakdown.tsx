import { Icon } from "@/components/Icons";
import { formatAmount } from "@/lib/format";
import type { SourceSavings } from "@/types";

type SourceBreakdownProps = {
  title: string;
  rows: SourceSavings[];
};

export function SourceBreakdown({ title, rows }: SourceBreakdownProps) {
  const total = rows.reduce((sum, row) => sum + row.saved, 0);

  return (
    <div className="breakdown-group">
      <div className="breakdown-head">
        <h3>{title}</h3>
        <span className="mono breakdown-total">
          {title.includes("Birr")
            ? `${total.toLocaleString("en-US")} ETB`
            : `$${total.toLocaleString("en-US")}`}
        </span>
      </div>
      {rows.map(({ rule, saved, share }) => (
        <div key={rule.id} className="breakdown-row">
          <div className="breakdown-top">
            <span className={`breakdown-chip ${rule.cls}`}>
              <Icon name={rule.iconKey} />
            </span>
            <span className="breakdown-name">{rule.who}</span>
            <span className="breakdown-amt mono">{formatAmount(saved, rule.currency)}</span>
          </div>
          <div className="breakdown-track" aria-hidden="true">
            <div
              className={`breakdown-fill ${rule.cls}`}
              style={{ width: `${Math.max(share, saved > 0 ? 8 : 0)}%` }}
            />
          </div>
          <span className="breakdown-share">{saved > 0 ? `${Math.round(share)}%` : "—"}</span>
        </div>
      ))}
    </div>
  );
}
