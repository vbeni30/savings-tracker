"use client";

import dynamic from "next/dynamic";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const SavingsTracker = dynamic(
  () => import("@/components/SavingsTracker").then((mod) => mod.SavingsTracker),
  {
    ssr: false,
    loading: () => (
      <div className="wrap">
        <div className="loading">Loading…</div>
      </div>
    ),
  },
);

export function ClientSavingsTracker() {
  return (
    <>
      <ServiceWorkerRegister />
      <SavingsTracker />
    </>
  );
}
