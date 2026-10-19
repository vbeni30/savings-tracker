import { NextResponse } from "next/server";

export const revalidate = 3600;

type ErApiResponse = {
  result?: string;
  rates?: Record<string, number>;
  time_last_update_utc?: string;
};

/** USD base rates for ETB, GBP, EUR (and USD = 1). */
export async function GET() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Could not fetch exchange rates." }, { status: 502 });
    }

    const body = (await response.json()) as ErApiResponse;
    if (body.result !== "success" || !body.rates) {
      return NextResponse.json({ error: "Invalid rate response." }, { status: 502 });
    }

    const pick = (code: string) => body.rates![code];
    const etb = pick("ETB");
    const gbp = pick("GBP");
    const eur = pick("EUR");

    if (!etb || !gbp || !eur) {
      return NextResponse.json({ error: "Missing ETB, GBP, or EUR in rate feed." }, { status: 502 });
    }

    return NextResponse.json({
      base: "USD",
      updatedAt: body.time_last_update_utc ?? new Date().toISOString(),
      rates: { ETB: etb, GBP: gbp, EUR: eur },
    });
  } catch {
    return NextResponse.json({ error: "Could not fetch exchange rates." }, { status: 502 });
  }
}
