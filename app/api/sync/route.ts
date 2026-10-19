import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { combineSyncPayloads, emptySyncPayload, isEmptyPayload } from "@/lib/sync/merge";
import {
  isCloudSyncConfigured,
  readSyncPayload,
  writeSyncPayload,
} from "@/lib/sync/server-store";
import { validateSyncPayload } from "@/lib/sync/validate";
import type { SyncPayload } from "@/types/sync";

const MAX_BODY_BYTES = 4 * 1024 * 1024;

function parsePayload(body: unknown): SyncPayload | null {
  return validateSyncPayload(body);
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
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Sync payload too large." }, { status: 413 });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return NextResponse.json({ error: "Invalid sync payload." }, { status: 400 });
    }
    const body = parsePayload(parsed);
    if (!body) {
      return NextResponse.json({ error: "Invalid sync payload." }, { status: 400 });
    }

    const existing = await readSyncPayload();

    if (!existing || isEmptyPayload(existing)) {
      await writeSyncPayload(body);
      return NextResponse.json({ ok: true, updatedAt: body.updatedAt });
    }

    const clientTime = Date.parse(body.updatedAt);
    const serverTime = Date.parse(existing.updatedAt);

    if (clientTime >= serverTime) {
      await writeSyncPayload(body);
      return NextResponse.json({ ok: true, updatedAt: body.updatedAt });
    }

    const merged = combineSyncPayloads(body, existing);
    await writeSyncPayload(merged);
    return NextResponse.json({
      ok: true,
      updatedAt: merged.updatedAt,
      merged: true,
      data: merged,
    });
  } catch {
    return NextResponse.json({ error: "Could not save sync data." }, { status: 500 });
  }
}
