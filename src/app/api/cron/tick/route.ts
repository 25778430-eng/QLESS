import { NextResponse } from "next/server";
import { sameSecret } from "@/lib/auth";
import { tick } from "@/lib/bookings";

export const dynamic = "force-dynamic";

/** Call every minute: sends reminders, expires unpaid bookings and no-shows, ends pauses. */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || !sameSecret(auth ?? "", `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  return NextResponse.json(await tick());
}

export const GET = handle;
export const POST = handle;
