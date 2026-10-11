"use client";
import { useFormStatus } from "react-dom";

export function Submit({ children, className = "btn", name, value }: { children: React.ReactNode; className?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} name={name} value={value}>
      {pending ? "Working…" : children}
    </button>
  );
}
