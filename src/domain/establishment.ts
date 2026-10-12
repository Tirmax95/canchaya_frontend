/**
 * Servicios de la sede. Debe coincidir con `src/domain/establishment-details.ts` del backend,
 * que es quien los valida.
 */
export const ESTABLISHMENT_AMENITIES = [
  "parking",
  "locker_rooms",
  "showers",
  "cafeteria",
  "wifi",
  "night_lighting",
  "covered",
  "equipment_rental",
  "first_aid",
  "accessible",
  "store",
  "grill_area",
] as const;

export type EstablishmentAmenity = (typeof ESTABLISHMENT_AMENITIES)[number];

export const MAX_GALLERY_IMAGES = 8;

/** Orden de la semana en formularios y fichas: lunes primero. 0 = domingo (Date#getDay). */
export const WEEK_DAYS_MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;

/** Día 0 = domingo … 6 = sábado. Horas locales `HH:MM`; `24:00` = medianoche. */
export interface OpeningHoursDay {
  day: number;
  closed: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface Establishment {
  establishmentId: number;
  name: string;
  address: string;
  phone: string;
  imageEstablishment: string;
  organizationId?: number | null;
  organizationName?: string;
  createdAt?: string;
  updatedAt?: string;
  description: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  email: string;
  whatsapp: string;
  website: string;
  instagram: string;
  openingHours: OpeningHoursDay[];
  amenities: EstablishmentAmenity[];
  galleryImages: string[];
  policies: string;
  isActive: boolean;
}

export interface EstablishmentCatalogItem extends Establishment {
  fieldCount: number;
  minPricePerHour: number | null;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Centro por defecto del selector de mapa (Bogotá) cuando la sede aún no tiene ubicación. */
export const DEFAULT_MAP_CENTER: GeoPoint = { latitude: 4.711, longitude: -74.0721 };

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const AMENITY_SET: ReadonlySet<string> = new Set(ESTABLISHMENT_AMENITIES);

/**
 * Propósito: Minutos desde medianoche de un `HH:MM`.
 */
function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  /**
   * Output:
   * @returns number — 0..1440
   */
  return hours * 60 + minutes;
}

/**
 * Propósito: Allowlist de servicios en orden de catálogo.
 */
export function normalizeAmenities(values: unknown): EstablishmentAmenity[] {
  if (!Array.isArray(values)) {
    /**
     * Output:
     * @returns EstablishmentAmenity[] — Vacío si no es lista
     */
    return [];
  }
  const requested = new Set(
    values.filter(
      (value): value is EstablishmentAmenity => typeof value === "string" && AMENITY_SET.has(value),
    ),
  );
  /**
   * Output:
   * @returns EstablishmentAmenity[] — Subconjunto válido
   */
  return ESTABLISHMENT_AMENITIES.filter((amenity) => requested.has(amenity));
}

/**
 * Propósito: Valida el horario semanal con las mismas reglas que el backend.
 */
export function validateOpeningHours(hours: OpeningHoursDay[]): string | null {
  const seenDays = new Set<number>();
  for (const entry of hours) {
    if (!Number.isInteger(entry.day) || entry.day < 0 || entry.day > 6 || seenDays.has(entry.day)) {
      /**
       * Output:
       * @returns string — Día inválido o repetido
       */
      return "invalidDay";
    }
    seenDays.add(entry.day);
    if (entry.closed) {
      continue;
    }
    if (
      !entry.opensAt ||
      !entry.closesAt ||
      !TIME_PATTERN.test(entry.opensAt) ||
      !TIME_PATTERN.test(entry.closesAt)
    ) {
      /**
       * Output:
       * @returns string — Formato de hora inválido
       */
      return "invalidTime";
    }
    if (toMinutes(entry.opensAt) >= toMinutes(entry.closesAt)) {
      /**
       * Output:
       * @returns string — Apertura después del cierre
       */
      return "invertedRange";
    }
  }
  /**
   * Output:
   * @returns null — Horario válido
   */
  return null;
}

/**
 * Propósito: Horario del día de la semana indicado, o null si la sede no lo configuró.
 */
export function getOpeningHoursForDay(
  hours: OpeningHoursDay[],
  day: number,
): OpeningHoursDay | null {
  /**
   * Output:
   * @returns OpeningHoursDay | null — Entrada del día
   */
  return hours.find((entry) => entry.day === day) ?? null;
}

/**
 * Propósito: True si la sede está abierta en ese instante, según la hora local que recibe
 * (día y minutos). Null si no hay horario cargado para ese día.
 */
export function isOpenAt(
  hours: OpeningHoursDay[],
  day: number,
  minutesSinceMidnight: number,
): boolean | null {
  const entry = getOpeningHoursForDay(hours, day);
  if (!entry) {
    /**
     * Output:
     * @returns null — Sin horario publicado
     */
    return null;
  }
  if (entry.closed || !entry.opensAt || !entry.closesAt) {
    /**
     * Output:
     * @returns false — Cerrado ese día
     */
    return false;
  }
  /**
   * Output:
   * @returns boolean — Dentro de la franja de apertura
   */
  return (
    minutesSinceMidnight >= toMinutes(entry.opensAt) &&
    minutesSinceMidnight < toMinutes(entry.closesAt)
  );
}

/**
 * Propósito: True si la sede tiene coordenadas utilizables en un mapa.
 */
export function hasLocation<T extends Pick<Establishment, "latitude" | "longitude">>(
  establishment: T,
): establishment is T & { latitude: number; longitude: number } {
  /**
   * Output:
   * @returns boolean — Latitud y longitud finitas
   */
  return (
    typeof establishment.latitude === "number" &&
    typeof establishment.longitude === "number" &&
    Number.isFinite(establishment.latitude) &&
    Number.isFinite(establishment.longitude)
  );
}

/**
 * Propósito: Enlaces de "cómo llegar" en Google Maps y Waze. Usa coordenadas si existen;
 * si no, la dirección como búsqueda.
 */
export function buildDirectionsLinks(
  establishment: Pick<Establishment, "latitude" | "longitude" | "address" | "city" | "name">,
): { googleMaps: string; waze: string } | null {
  if (hasLocation(establishment)) {
    const coordinates = `${establishment.latitude},${establishment.longitude}`;
    /**
     * Output:
     * @returns object — Rutas por coordenadas
     */
    return {
      googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates)}`,
      waze: `https://waze.com/ul?ll=${encodeURIComponent(coordinates)}&navigate=yes`,
    };
  }
  const query = [establishment.address, establishment.city].filter(Boolean).join(", ");
  if (!query) {
    /**
     * Output:
     * @returns null — Sin dirección ni coordenadas
     */
    return null;
  }
  /**
   * Output:
   * @returns object — Rutas por dirección
   */
  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`,
    waze: `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`,
  };
}

/**
 * Propósito: Enlace de WhatsApp con solo dígitos (wa.me no acepta `+` ni espacios).
 */
export function buildWhatsAppLink(whatsapp: string): string | null {
  const digits = whatsapp.replace(/\D/g, "");
  /**
   * Output:
   * @returns string | null — wa.me o null si no hay número válido
   */
  return digits.length >= 7 ? `https://wa.me/${digits}` : null;
}

/**
 * Propósito: Enlace al perfil de Instagram a partir del usuario (con o sin @).
 */
export function buildInstagramLink(instagram: string): string | null {
  const handle = instagram.trim().replace(/^@/, "");
  /**
   * Output:
   * @returns string | null — URL del perfil o null
   */
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? `https://instagram.com/${handle}` : null;
}

/**
 * Propósito: Porcentaje de la ficha completada, para guiar al dueño en el panel.
 */
export function getProfileCompleteness(establishment: Establishment): number {
  const checks = [
    establishment.description.length >= 20,
    Boolean(establishment.address),
    Boolean(establishment.city),
    hasLocation(establishment),
    Boolean(establishment.phone || establishment.whatsapp),
    establishment.openingHours.length > 0,
    establishment.amenities.length > 0,
    Boolean(establishment.imageEstablishment),
    establishment.galleryImages.length > 0,
  ];
  /**
   * Output:
   * @returns number — 0..100
   */
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
