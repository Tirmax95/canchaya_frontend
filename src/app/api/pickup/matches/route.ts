import { requireSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import {
  createPickupMatch,
  listMyMatches,
  listPickupFeed,
} from "@/data/pickup.repository";
import { BOGOTA } from "@/domain/pickup";
import { createPickupMatchSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Feed público o, con ?mine=1, partidos del actor autenticado.
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const url = new URL(request.url);
    if (url.searchParams.get("mine") === "1") {
      await requireSession();
      return { matches: await listMyMatches() };
    }
    const lat = readCoordinate(url.searchParams.get("lat"), 90, BOGOTA.lat);
    const lng = readCoordinate(url.searchParams.get("lng"), 180, BOGOTA.lng);
    return { matches: await listPickupFeed(lat, lng) };
  }, "No se pudieron cargar los partidos");
}

/**
 * Propósito: Crea un partido draft. El organizador es la sesión, no el body.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireSession();
    const input = parseSchema(
      createPickupMatchSchema,
      await readJsonBody(request),
    );
    return { match: await createPickupMatch(input) };
  }, "No se pudo convocar el partido");
}

/**
 * Propósito: Coordenada de query string dentro de rango; si no es válida, usa la de Bogotá.
 */
function readCoordinate(raw: string | null, limit: number, fallback: number): number {
  const value = raw === null ? Number.NaN : Number(raw);
  /**
   * Output:
   * @returns number — Coordenada válida
   */
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : fallback;
}
