import { buildAndroidAssetLinks } from "@/domain/app-links";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Propósito: Verificación de App Links de Android. Sin paquete y huellas válidas responde 404.
 */
export function GET() {
  const links = buildAndroidAssetLinks(
    process.env.MOBILE_ANDROID_PACKAGE ?? "com.canchaya.app",
    process.env.MOBILE_ANDROID_CERT_SHA256,
  );
  /**
   * Output:
   * @returns NextResponse — JSON de Digital Asset Links o 404
   */
  return links
    ? NextResponse.json(links, { headers: { "Cache-Control": "public, max-age=3600" } })
    : new NextResponse(null, { status: 404 });
}
