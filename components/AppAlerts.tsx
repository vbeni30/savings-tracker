"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { LOW_SPENDABLE_ETB_THRESHOLD } from "@/lib/constants";
import {
  dismissBackupReminder,
  dismissLowSpendableAlert,
  shouldShowBackupReminder,
  shouldShowLowSpendableAlert,
} from "@/lib/storage";

type AppAlertsProps = {
  entryCount: number;
  spendableEtb: number;
  onExport: () => void;
};

export function AppAlerts({ entryCount, spendableEtb, onExport }: AppAlertsProps) {
  const [showLowSpendable, setShowLowSpendable] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  useEffect(() => {
    setShowLowSpendable(shouldShowLowSpendableAlert(spendableEtb, LOW_SPENDABLE_ETB_THRESHOLD));
    setShowBackup(shouldShowBackupReminder(entryCount));
  }, [entryCount, spendableEtb]);

  if (!showLowSpendable && !showBackup) return null;

  return (
    <div className="app-alerts">
      {showLowSpendable && (
        <div className="alert-banner alert-warn" role="status">
          <div className="alert-body">
            <strong>Spendable ETB is low</strong>
            <p>
              You have {spendableEtb.toLocaleString("en-US")} ETB left for daily costs (under{" "}
              {LOW_SPENDABLE_ETB_THRESHOLD.toLocaleString("en-US")}). Hold off non-essentials until
              the next payday if you can.
            </p>
          </div>
          <button
            type="button"
            className="alert-dismiss"
            aria-label="Dismiss low spendable alert"
            onClick={() => {
              dismissLowSpendableAlert();
              setShowLowSpendable(false);
            }}
          >
            ×
          </button>
        </div>
      )}

      {showBackup && (
        <div className="alert-banner alert-info" role="status">
          <div className="alert-body">
            <strong>Back up your ledger</strong>
            <p>
              Your data lives in this browser only. Export a JSON backup so you don&apos;t lose it if
              you clear storage or switch devices.
            </p>
            <button
              type="button"
              className="alert-action"
              onClick={() => {
                onExport();
                setShowBackup(false);
              }}
            >
              <Icon name="download" />
              Export now
            </button>
          </div>
          <button
            type="button"
            className="alert-dismiss"
            aria-label="Dismiss backup reminder"
            onClick={() => {
              dismissBackupReminder();
              setShowBackup(false);
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
