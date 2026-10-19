"use client";

import { useEffect, useState } from "react";

export type FxRates = {
  base: "USD";
  updatedAt: string;
  rates: { ETB: number; GBP: number; EUR: number };
};

export function useFxRates() {
  const [rates, setRates] = useState<FxRates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/fx/rates");
        if (!response.ok) throw new Error("fetch failed");
        const body = (await response.json()) as FxRates;
        if (!cancelled) {
          setRates(body);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Rates unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rates, error, loading };
}
