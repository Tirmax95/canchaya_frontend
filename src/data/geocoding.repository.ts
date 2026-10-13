import "server-only";
import { APP_NAME } from "@/core/config/app";
import { AppError } from "@/core/errors/app-error";

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const GEOCODING_TIMEOUT_MS = 6_000;
const MAX_RESULTS = 5;

export interface GeocodingResult {
  label: string;
  latitude: number;
  longitude: number;
  city: string;
  address: string;
}

interface NominatimAddress {
  road?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
}

interface NominatimPlace {
  display_name?: unknown;
  lat?: unknown;
  lon?: unknown;
  address?: NominatimAddress;
}

/**
 * Propósito: Llama a Nominatim (OpenStreetMap) con timeout y User-Agent propio, como pide
 * su política de uso. Único punto de la app que habla con el geocodificador.
 */
async function requestNominatim(url: URL, locale: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": `${APP_NAME} venue-geocoder`,
        "Accept-Language": locale,
      },
      signal: AbortSignal.timeout(GEOCODING_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    /**
     * Output:
     * @throws AppError — Timeout o red caída
     */
    throw new AppError("UPSTREAM", "El servicio de mapas no respondió", 502);
  }
  if (response.status === 429) {
    /**
     * Output:
     * @throws AppError — Límite de uso del servicio de mapas
     */
    throw new AppError("RATE_LIMITED", "Demasiadas búsquedas, intenta en unos segundos", 429);
  }
  if (!response.ok) {
    throw new AppError("UPSTREAM", "El servicio de mapas no respondió", 502);
  }
  /**
   * Output:
   * @returns unknown — JSON crudo de Nominatim
   */
  return response.json();
}

/**
 * Propósito: Traduce un lugar de Nominatim a un resultado mínimo y seguro.
 */
function toGeocodingResult(place: NominatimPlace): GeocodingResult | null {
  const latitude = Number(place.lat);
  const longitude = Number(place.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    /**
     * Output:
     * @returns null — Lugar sin coordenadas
     */
    return null;
  }
  const address = place.address ?? {};
  const street = [address.road, address.house_number].filter(Boolean).join(" ");
  /**
   * Output:
   * @returns GeocodingResult — Etiqueta, coordenadas, ciudad y dirección corta
   */
  return {
    label: typeof place.display_name === "string" ? place.display_name.slice(0, 300) : "",
    latitude: Number(latitude.toFixed(7)),
    longitude: Number(longitude.toFixed(7)),
    city: (address.city ?? address.town ?? address.village ?? address.municipality ?? "").slice(0, 80),
    address: (street || address.neighbourhood || address.suburb || "").slice(0, 180),
  };
}

/**
 * Propósito: Busca direcciones o lugares por texto.
 */
export async function searchPlaces(query: string, locale: string): Promise<GeocodingResult[]> {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(MAX_RESULTS));
  const payload = await requestNominatim(url, locale);
  /**
   * Output:
   * @returns GeocodingResult[] — Hasta 5 coincidencias
   */
  return Array.isArray(payload)
    ? payload
        .map((place) => toGeocodingResult(place as NominatimPlace))
        .filter((result): result is GeocodingResult => result !== null)
    : [];
}

/**
 * Propósito: Dirección aproximada del punto marcado en el mapa.
 */
export async function reversePlace(
  latitude: number,
  longitude: number,
  locale: string,
): Promise<GeocodingResult | null> {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  const payload = await requestNominatim(url, locale);
  /**
   * Output:
   * @returns GeocodingResult | null — Lugar más cercano
   */
  return payload && typeof payload === "object" ? toGeocodingResult(payload as NominatimPlace) : null;
}
