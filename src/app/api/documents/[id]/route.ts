import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Verification files are private: only admins and the shop's owner can open them. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) return new NextResponse("Sign in first", { status: 401 });
  const doc = await db.document.findUnique({ where: { id: params.id }, include: { vendor: { select: { ownerId: true } } } });
  if (!doc || (user.role !== "ADMIN" && doc.vendor.ownerId !== user.id)) return new NextResponse("Not found", { status: 404 });
  if (!doc.data) return new NextResponse("This file was deleted after review.", { status: 410 });
  return new NextResponse(doc.data, {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
