import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { emptySyncPayload } from "@/lib/sync/merge";
import {
  isCloudSyncConfigured,
  readSyncPayload,
  writeSyncPayload,
} from "@/lib/sync/server-store";
import type { SyncPayload } from "@/types/sync";

function parsePayload(body: unknown): SyncPayload | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Partial<SyncPayload>;
  if (record.version !== 1) return null;
  if (typeof record.updatedAt !== "string") return null;
  if (!Array.isArray(record.ledger) || !Array.isArray(record.goals)) return null;
  if (typeof record.openingDone !== "boolean") return null;
  return record as SyncPayload;
}

export async function GET() {
  if (!(await getSessionFromCookies())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabled = isCloudSyncConfigured();
  if (!enabled) {
    return NextResponse.json({ enabled: false, data: null });
  }

  try {
    const data = (await readSyncPayload()) ?? emptySyncPayload();
    return NextResponse.json({ enabled: true, data });
  } catch {
    return NextResponse.json({ error: "Could not read sync data." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await getSessionFromCookies())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCloudSyncConfigured()) {
    return NextResponse.json({ error: "Cloud sync is not configured on the server." }, { status: 503 });
  }

  try {
    const body = parsePayload(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Invalid sync payload." }, { status: 400 });
    }

    const existing = await readSyncPayload();
    if (existing && Date.parse(body.updatedAt) < Date.parse(existing.updatedAt)) {
      return NextResponse.json({ error: "conflict", server: existing }, { status: 409 });
    }

    await writeSyncPayload(body);
    return NextResponse.json({ ok: true, updatedAt: body.updatedAt });
  } catch {
    return NextResponse.json({ error: "Could not save sync data." }, { status: 500 });
  }
}
