"use client";

import { useEffect, useState } from "react";

type OpeningBalanceModalProps = {
  onClose: () => void;
  onSubmit: (params: { savedEtb: number; spendableEtb: number; savedUsd: number }) => void;
  onSkip: () => void;
  allowSkip?: boolean;
};

export function OpeningBalanceModal({
  onClose,
  onSubmit,
  onSkip,
  allowSkip = true,
}: OpeningBalanceModalProps) {
  const [savedEtb, setSavedEtb] = useState("");
  const [spendableEtb, setSpendableEtb] = useState("");
  const [savedUsd, setSavedUsd] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && allowSkip) onSkip();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [allowSkip, onSkip]);

  const parseAmount = (value: string) => {
    const num = Number(value.replace(/,/g, ""));
    return Number.isNaN(num) || num < 0 ? 0 : num;
  };

  const handleSubmit = () => {
    onSubmit({
      savedEtb: parseAmount(savedEtb),
      spendableEtb: parseAmount(spendableEtb),
      savedUsd: parseAmount(savedUsd),
    });
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && allowSkip) onSkip();
      }}
      role="presentation"
    >
      <div className="modal form-modal" role="dialog" aria-modal="true" aria-labelledby="opening-title">
        <h3 id="opening-title">Set your starting balances</h3>
        <p className="modal-desc">
          How much did you already have before using this tracker? Leave blank if zero — you can
          adjust later in settings.
        </p>

        <label className="field-label">
          Saved ETB (savings pool)
          <input
            className="field-input mono"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={savedEtb}
            onChange={(event) => setSavedEtb(event.target.value)}
            autoFocus
          />
        </label>

        <label className="field-label">
          Spendable ETB (daily costs pool)
          <input
            className="field-input mono"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={spendableEtb}
            onChange={(event) => setSpendableEtb(event.target.value)}
          />
        </label>

        <label className="field-label">
          Saved USD
          <input
            className="field-input mono"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={savedUsd}
            onChange={(event) => setSavedUsd(event.target.value)}
          />
        </label>

        <div className="modal-actions">
          {allowSkip ? (
            <button type="button" className="modal-cancel" onClick={onSkip}>
              Skip for now
            </button>
          ) : (
            <button type="button" className="modal-cancel" onClick={onClose}>
              Cancel
            </button>
          )}
          <button type="button" className="log-btn modal-submit" onClick={handleSubmit}>
            Save balances
          </button>
        </div>
      </div>
    </div>
  );
}
