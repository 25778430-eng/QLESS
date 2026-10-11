"use client";
import { useEffect, useState } from "react";

function b64ToUint8(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Lets a customer turn on push notifications for this device. */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<"unknown" | "on" | "off" | "unsupported" | "denied">("unknown");
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !publicKey) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.register("/sw.js").then(async (reg) => setState((await reg.pushManager.getSubscription()) ? "on" : "off"));
  }, [publicKey]);

  async function enable() {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return setState("denied");
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(publicKey) });
    await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
    setState("on");
  }

  const text = {
    unknown: "Checking…",
    on: "Push notifications are on for this device.",
    off: "Get a notification on this device when it's nearly your turn.",
    unsupported: "Push notifications aren't available here. You'll still get SMS and WhatsApp.",
    denied: "Notifications are blocked. Allow them in your browser settings.",
  }[state];

  return (
    <div className="row between fill">
      <span className="small">{text}</span>
      {state === "off" && <button className="btn sm" type="button" onClick={enable}>Turn on</button>}
    </div>
  );
}
