"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const setup = async () => {
      // Dev HMR breaks when a service worker caches stale webpack chunks.
      if (process.env.NODE_ENV !== "production") {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
        return;
      }

      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Offline support is optional — ignore registration failures.
      }
    };

    if (document.readyState === "complete") {
      void setup();
    } else {
      window.addEventListener("load", () => void setup(), { once: true });
    }
  }, []);

  return null;
}
