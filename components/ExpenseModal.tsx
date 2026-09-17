"use client";

import { useEffect, useState } from "react";
import type { Currency, Pool } from "@/types";

type ExpenseModalProps = {
  onClose: () => void;
  onSubmit: (params: {
    amount: number;
    currency: Currency;
    pool: Pool;
    note?: string;
  }) => void;
};

export function ExpenseModal({ onClose, onSubmit }: ExpenseModalProps) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("ETB");
  const [pool, setPool] = useState<Pool>("spendable");
  const [note, setNote] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = () => {
    const value = Number(amount.replace(/,/g, ""));
    if (Number.isNaN(value) || value <= 0) return;
    onSubmit({ amount: value, currency, pool, note: note.trim() || undefined });
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div className="modal form-modal" role="dialog" aria-modal="true" aria-labelledby="expense-title">
        <h3 id="expense-title">Log expense</h3>
        <p className="modal-desc">Choose which pool this comes from — spendable for daily costs, saved only if necessary.</p>

        <label className="field-label">
          Amount
          <input
            className="field-input mono"
            type="text"
            inputMode="decimal"
            placeholder={currency === "ETB" ? "5000" : "50"}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            autoFocus
          />
        </label>

        <div className="field-row">
          <label className="field-label">
            Currency
            <select
              className="field-input"
              value={currency}
              onChange={(event) => setCurrency(event.target.value as Currency)}
            >
              <option value="ETB">ETB</option>
              <option value="USD">USD</option>
            </select>
          </label>

          <label className="field-label">
            From pool
            <select
              className="field-input"
              value={pool}
              onChange={(event) => setPool(event.target.value as Pool)}
            >
              <option value="spendable">Spendable</option>
              <option value="saved">Saved</option>
            </select>
          </label>
        </div>

        <label className="field-label">
          Note (optional)
          <input
            className="field-input"
            type="text"
            placeholder="Groceries, transport…"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="log-btn modal-submit" onClick={handleSubmit}>
            Log expense
          </button>
        </div>
      </div>
    </div>
  );
}
