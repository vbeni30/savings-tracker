import fs from "fs/promises";
import path from "path";
import { BlobNotFoundError, get, head, put } from "@vercel/blob";
import type { SyncPayload } from "@/types/sync";

const BLOB_PATH = "savings-tracker/owner-sync.json";
const DEV_FILE = path.join(process.cwd(), ".data", "owner-sync.json");

export function isCloudSyncConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) || process.env.NODE_ENV === "development";
}

async function readDevFile(): Promise<SyncPayload | null> {
  try {
    const raw = await fs.readFile(DEV_FILE, "utf8");
    return JSON.parse(raw) as SyncPayload;
  } catch {
    return null;
  }
}

async function writeDevFile(payload: SyncPayload): Promise<void> {
  await fs.mkdir(path.dirname(DEV_FILE), { recursive: true });
  await fs.writeFile(DEV_FILE, JSON.stringify(payload, null, 2), "utf8");
}

async function readBlob(): Promise<SyncPayload | null> {
  try {
    const meta = await head(BLOB_PATH);
    const result = await get(meta.url, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as SyncPayload;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    return null;
  }
}

async function writeBlob(payload: SyncPayload): Promise<void> {
  await put(BLOB_PATH, JSON.stringify(payload), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function readSyncPayload(): Promise<SyncPayload | null> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return readBlob();
  }
  if (process.env.NODE_ENV === "development") {
    return readDevFile();
  }
  return null;
}

export async function writeSyncPayload(payload: SyncPayload): Promise<void> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await writeBlob(payload);
    return;
  }
  if (process.env.NODE_ENV === "development") {
    await writeDevFile(payload);
    return;
  }
  throw new Error("Cloud sync storage is not configured.");
}
