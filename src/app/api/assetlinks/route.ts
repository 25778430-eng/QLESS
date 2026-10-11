import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Served at /.well-known/assetlinks.json (see next.config.mjs). Proves to Android that the Play Store app owns this
 * domain, so it opens full screen without a browser address bar. Fingerprints come from Play Console > App integrity.
 */
export function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME;
  const fingerprints = (process.env.ANDROID_CERT_SHA256 || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!pkg || !fingerprints.length) return NextResponse.json([]);
  return NextResponse.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: fingerprints },
    },
  ]);
}
