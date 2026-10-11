"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Detector = { detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };

/** Uses the browser's built-in QR detector where available (Chrome on Android). */
export function Scanner() {
  const video = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const [msg, setMsg] = useState("Starting camera…");

  useEffect(() => {
    const W = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector };
    if (!W.BarcodeDetector || !navigator.mediaDevices) {
      setMsg("This browser can't scan in the app. Use your phone's camera app instead.");
      return;
    }
    const detector = new W.BarcodeDetector({ formats: ["qr_code"] });
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        if (!video.current) return;
        video.current.srcObject = s;
        video.current.play();
        setMsg("Point at the QR code");
        timer = setInterval(async () => {
          if (!video.current) return;
          const codes = await detector.detect(video.current).catch(() => []);
          const hit = codes.map((c) => c.rawValue).find((v) => /\/v\/[\w-]+/.test(v));
          if (hit) {
            clearInterval(timer);
            router.push(new URL(hit, location.origin).pathname);
          }
        }, 400);
      })
      .catch(() => setMsg("Camera access was blocked. Allow it in your browser settings."));
    return () => {
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [router]);

  return (
    <div className="stack">
      <video ref={video} playsInline muted style={{ width: "100%", borderRadius: 20, background: "#000", aspectRatio: "1" }} />
      <p className="small muted center">{msg}</p>
    </div>
  );
}
