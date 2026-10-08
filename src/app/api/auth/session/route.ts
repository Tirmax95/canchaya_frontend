import { getSession, toClientUser } from "@/core/auth/session";
import { NextResponse } from "next/server";

/**
 * Propósito: Expone la sesión pública al cliente, sin sessionId.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    /**
     * Output:
     * @returns NextResponse — 401
     */
    return NextResponse.json({ user: null }, { status: 401 });
  }

  /**
   * Output:
   * @returns NextResponse — Usuario sin secretos
   */
  return NextResponse.json({ user: toClientUser(session) });
}
