"use client";
import { useEffect, useState } from "react";

export function Countdown({ until }: { until: string }) {
  const end = new Date(until).getTime();
  const [left, setLeft] = useState(() => Math.max(0, end - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, end - Date.now())), 1000);
    return () => clearInterval(t);
  }, [end]);
  const s = Math.floor(left / 1000);
  return <div className="countdown" aria-live="polite">{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</div>;
}
