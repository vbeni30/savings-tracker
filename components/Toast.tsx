"use client";

import { useEffect } from "react";

type ToastProps = {
  message: string;
  onClose: () => void;
  duration?: number;
};

export function Toast({ message, onClose, duration = 2200 }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [duration, onClose]);

  return <div className="toast">{message}</div>;
}
