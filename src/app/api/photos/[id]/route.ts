import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const photo = await db.photo.findUnique({ where: { id: params.id } });
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(photo.data, {
    headers: { "Content-Type": photo.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
