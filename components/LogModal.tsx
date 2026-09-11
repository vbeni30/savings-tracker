"use client";

import { useEffect } from "react";
import { Icon } from "@/components/Icons";
import { formatAmount } from "@/lib/format";
import { PAYDAY_RULES } from "@/lib/rules";
import type { PaydayRule } from "@/types";

type LogModalProps = {
  onClose: () => void;
  onSelect: (rule: PaydayRule) => void;
};

export function LogModal({ onClose, onSelect }: LogModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="log-modal-title">
        <h3 id="log-modal-title">Which payday came in?</h3>
        {PAYDAY_RULES.map((rule) => (
          <button
            key={rule.id}
            type="button"
            className="modal-opt"
            onClick={() => onSelect(rule)}
          >
            <span className="inline-icon">
              <Icon name={rule.iconKey} />
              &nbsp;{rule.who}
            </span>
            <span className="a">{formatAmount(rule.save, rule.currency)}</span>
          </button>
        ))}
        <button type="button" className="modal-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
