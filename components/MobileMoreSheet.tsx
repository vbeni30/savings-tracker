"use client";

import { useEffect } from "react";

type MobileMoreSheetProps = {
  open: boolean;
  onClose: () => void;
  onAdjust: () => void;
  onInstall: () => void;
  onSignOut: () => void;
};

export function MobileMoreSheet({
  open,
  onClose,
  onAdjust,
  onInstall,
  onSignOut,
}: MobileMoreSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div className="modal mobile-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title">
        <h3 id="mobile-more-title">More</h3>
        <button
          type="button"
          className="modal-opt"
          onClick={() => {
            onAdjust();
            onClose();
          }}
        >
          Adjust balance
        </button>
        <button
          type="button"
          className="modal-opt"
          onClick={() => {
            onInstall();
            onClose();
          }}
        >
          Install app
        </button>
        <button
          type="button"
          className="modal-opt"
          onClick={() => {
            onSignOut();
            onClose();
          }}
        >
          Sign out
        </button>
        <button type="button" className="modal-cancel" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
