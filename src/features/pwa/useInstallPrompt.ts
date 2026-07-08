"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function detectIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIPhoneFamily = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS13Plus =
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1;
  return isIPhoneFamily || isIPadOS13Plus;
}

/** Instalabilidad PWA: captura beforeinstallprompt, detecta iOS y standalone. */
export function useInstallPrompt() {
  const [ready, setReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setReady(true);
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return {
    ready,
    canInstall: ready && Boolean(deferredPrompt),
    isIOS: ready && detectIOS(),
    isStandalone: ready && (detectStandalone() || installed),
    promptInstall,
  };
}
