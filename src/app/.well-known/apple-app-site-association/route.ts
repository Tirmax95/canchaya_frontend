import { buildAppleAppSiteAssociation } from "@/domain/app-links";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Propósito: Verificación de universal links de iOS. Sin `MOBILE_IOS_APP_IDS` responde 404.
 */
export function GET() {
  const document = buildAppleAppSiteAssociation(process.env.MOBILE_IOS_APP_IDS);
  /**
   * Output:
   * @returns NextResponse — JSON (sin extensión, como exige Apple) o 404
   */
  return document
    ? NextResponse.json(document, { headers: { "Cache-Control": "public, max-age=3600" } })
    : new NextResponse(null, { status: 404 });
}
