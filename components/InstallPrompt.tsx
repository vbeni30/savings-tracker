"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";

const DISMISS_KEY = "savings-tracker-install-dismissed";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isLocalDev(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168.")
  );
}

function installMessage(): { title: string; body: string } {
  if (isIos()) {
    return {
      title: "Install on iPhone",
      body: "Tap Share → Add to Home Screen for a full-screen app with your wallet icon.",
    };
  }

  if (isLocalDev()) {
    return {
      title: "Install app (test mode)",
      body: "On iPhone Safari: Share → Add to Home Screen. On Android Chrome: menu → Install app. Desktop: use your browser install option if shown.",
    };
  }

  return {
    title: "Install Savings Tracker",
    body: "Add to your home screen for quick access — same wallet icon as the app.",
  };
}

type InstallPromptProps = {
  forceShow?: boolean;
};

export function InstallPrompt({ forceShow = false }: InstallPromptProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setVisible(false);
      return;
    }

    if (forceShow) {
      setVisible(true);
      return;
    }

    if (localStorage.getItem(DISMISS_KEY)) return;

    // Always show on local dev so you can test the banner before deploying.
    if (isLocalDev() || isIos()) {
      setVisible(true);
    }
  }, [forceShow]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const copy = installMessage();

  return (
    <div className="install-prompt" role="note">
      <div className="install-prompt-icon" aria-hidden="true">
        <Icon name="wallet" />
      </div>
      <div className="install-prompt-body">
        <strong>{copy.title}</strong>
        <p>{copy.body}</p>
      </div>
      <button type="button" className="install-dismiss" onClick={dismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

export function InstallButton({ onClick }: { onClick: () => void }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isStandalone()) setHidden(true);
  }, []);

  if (hidden) return null;

  return (
    <button type="button" className="ghost-btn install-top-btn" onClick={onClick}>
      Install
    </button>
  );
}

export function resetInstallDismissal(): void {
  localStorage.removeItem(DISMISS_KEY);
}
