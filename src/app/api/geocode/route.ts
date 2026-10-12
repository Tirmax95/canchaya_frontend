import { requireStaff } from "@/core/auth/guards";
import { getLocale } from "@/core/i18n/get-locale";
import { handleRoute } from "@/core/http/route";
import { reversePlace, searchPlaces } from "@/data/geocoding.repository";
import { geocodeQuerySchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Geocodificación para el formulario de sedes. Solo staff: evita que el BFF sea un
 * proxy abierto hacia Nominatim. Acepta `q` (búsqueda) o `lat` + `lng` (dirección inversa).
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireStaff();
    const params = new URL(request.url).searchParams;
    const query = parseSchema(geocodeQuerySchema, {
      q: params.get("q") ?? undefined,
      lat: params.get("lat") ?? undefined,
      lng: params.get("lng") ?? undefined,
    });
    const locale = await getLocale();
    if (query.q) {
      return { results: await searchPlaces(query.q, locale) };
    }
    const place = await reversePlace(query.lat as number, query.lng as number, locale);
    return { results: place ? [place] : [] };
  }, "No se pudo buscar la dirección");
}
