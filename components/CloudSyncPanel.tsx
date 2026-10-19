"use client";

type CloudSyncPanelProps = {
  syncEnabled: boolean;
};

export function CloudSyncPanel({ syncEnabled }: CloudSyncPanelProps) {
  if (syncEnabled) return null;

  return (
    <div className="sync-setup-card">
      <strong>Turn on cloud sync</strong>
      <p>Sync ledger and goals across phone and desktop with Vercel Blob storage.</p>
      <ol className="sync-setup-steps">
        <li>Vercel → your project → Storage → create a Blob store</li>
        <li>Link it to this project (adds BLOB_READ_WRITE_TOKEN)</li>
        <li>Redeploy, then open the app on each device while signed in</li>
      </ol>
      <p className="sync-setup-note">
        Until then, use Export / Import under History to move data manually.
      </p>
    </div>
  );
}
