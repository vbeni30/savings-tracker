import { Icon } from "@/components/Icons";
import { formatAmount, formatDate, formatWhenLabel } from "@/lib/format";
import type { UpcomingItem } from "@/types";

type UpcomingTimelineProps = {
  items: UpcomingItem[];
};

export function UpcomingTimeline({ items }: UpcomingTimelineProps) {
  return (
    <div className="timeline-card">
      <div className="timeline-line" aria-hidden="true" />
      {items.map(({ rule, date, days }, index) => (
        <div key={rule.id} className="timeline-item">
          <div className={`timeline-dot ${rule.cls}${index === 0 ? " next" : ""}`}>
            <Icon name={rule.iconKey} />
          </div>
          <div className="timeline-body">
            <div className="timeline-top">
              <span className="timeline-who">{rule.who}</span>
              <span className="timeline-amt mono">{formatAmount(rule.save, rule.currency)}</span>
            </div>
            <div className="timeline-meta">
              <span>{formatWhenLabel(days, date)}</span>
              <span>{formatDate(date)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
