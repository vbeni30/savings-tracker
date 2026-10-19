"use client";

import type { SyncConflict, SyncConflictResolution } from "@/hooks/useCloudSync";

type SyncConflictModalProps = {
  conflict: SyncConflict;
  onResolve: (mode: SyncConflictResolution) => void;
};

export function SyncConflictModal({ conflict, onResolve }: SyncConflictModalProps) {
  const localCount = conflict.local.ledger.length;
  const remoteCount = conflict.remote.ledger.length;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sync-conflict-title">
      <div className="modal sync-conflict-modal">
        <h2 id="sync-conflict-title" className="modal-title">
          Sync from two devices
        </h2>
        <p className="modal-desc">
          This device and the cloud both have different ledger entries. Choose how to combine them.
        </p>
        <ul className="sync-conflict-stats mono">
          <li>This device: {localCount} entries</li>
          <li>Cloud: {remoteCount} entries</li>
        </ul>
        <div className="sync-conflict-actions">
          <button type="button" className="log-btn" onClick={() => onResolve("merge")}>
            Merge both
          </button>
          <button type="button" className="ghost-btn" onClick={() => onResolve("cloud")}>
            Use cloud copy
          </button>
          <button type="button" className="ghost-btn" onClick={() => onResolve("device")}>
            Keep this device
          </button>
        </div>
      </div>
    </div>
  );
}
