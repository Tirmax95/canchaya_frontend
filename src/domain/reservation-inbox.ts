import { APP_UTC_OFFSET } from "@/domain/booking";
import type { ReservationStatus, ReservationView } from "@/domain/reservation";
import { RESERVATION_STATUSES } from "@/domain/reservation";

export const INBOX_STATUS_FILTERS = [
  "actionable",
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "all",
] as const;

export const INBOX_WINDOW_FILTERS = ["upcoming", "today", "past", "all"] as const;

export type InboxStatusFilter = (typeof INBOX_STATUS_FILTERS)[number];
export type InboxWindowFilter = (typeof INBOX_WINDOW_FILTERS)[number];

export const INBOX_STATUS_LABELS: Record<InboxStatusFilter, string> = {
  actionable: "Activas",
  pending: "Pendientes",
  confirmed: "Confirmadas",
  completed: "Completadas",
  cancelled: "Canceladas",
  all: "Todas",
};

export const INBOX_WINDOW_LABELS: Record<InboxWindowFilter, string> = {
  upcoming: "Próximas",
  today: "Hoy",
  past: "Pasadas",
  all: "Todas",
};

const ACTIONABLE_STATUSES = new Set<ReservationStatus>(["pending", "confirmed"]);
const UNKNOWN_TENANT_KEY = "unknown";
const MAX_SEARCH_LENGTH = 80;
const APP_UTC_OFFSET_HOURS = Number(APP_UTC_OFFSET.slice(0, 3));

export interface ReservationInboxFilters {
  tenantKey: string;
  status: InboxStatusFilter;
  window: InboxWindowFilter;
  query: string;
  fieldId: number | null;
}

export interface ReservationTenantOption {
  key: string;
  organizationId: number | null;
  label: string;
  establishmentNames: string[];
  totalCount: number;
  pendingCount: number;
}

export interface ReservationFieldOption {
  fieldId: number;
  fieldName: string;
}

export interface ReservationInboxSummary {
  total: number;
  pending: number;
  confirmedUpcoming: number;
  today: number;
  cancelled: number;
  activeRevenue: number;
}

export interface ReservationDayGroup {
  dayKey: string;
  reservations: ReservationView[];
}

export interface ReservationTenantGroup {
  key: string;
  organizationId: number | null;
  label: string;
  establishmentNames: string[];
  pendingCount: number;
  totalCount: number;
  dayGroups: ReservationDayGroup[];
}

export interface ReservationInbox {
  tenants: ReservationTenantOption[];
  fields: ReservationFieldOption[];
  summary: ReservationInboxSummary;
  groups: ReservationTenantGroup[];
  visibleCount: number;
  hiddenCancelledCount: number;
}

const EMPTY_SUMMARY: ReservationInboxSummary = {
  total: 0,
  pending: 0,
  confirmedUpcoming: 0,
  today: 0,
  cancelled: 0,
  activeRevenue: 0,
};

/**
 * Propósito: Convierte un instante ISO a fecha civil YYYY-MM-DD en la zona de la app.
 * Desplaza por el offset fijo de Bogotá para no depender de la zona del host.
 */
export function toCivilDate(iso: string): string {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) {
    /**
     * Output:
     * @returns string — Cadena vacía si el instante es inválido
     */
    return "";
  }
  const shifted = new Date(instant.getTime() + APP_UTC_OFFSET_HOURS * 3_600_000);
  /**
   * Output:
   * @returns string — Fecha civil YYYY-MM-DD
   */
  return shifted.toISOString().slice(0, 10);
}

/**
 * Propósito: Clave estable para agrupar por tenant (org) o, si no hay org, por sede.
 */
export function reservationTenantKey(reservation: ReservationView): string {
  if (reservation.organizationId && reservation.organizationId > 0) {
    /**
     * Output:
     * @returns string — Clave de organización
     */
    return `org:${reservation.organizationId}`;
  }
  if (reservation.establishmentId && reservation.establishmentId > 0) {
    /**
     * Output:
     * @returns string — Clave de sede suelta
     */
    return `est:${reservation.establishmentId}`;
  }
  /**
   * Output:
   * @returns string — Cubo para reservas sin catálogo
   */
  return UNKNOWN_TENANT_KEY;
}

/**
 * Propósito: Nombre visible del tenant: organización si existe, si no la sede.
 */
export function reservationTenantLabel(reservation: ReservationView): string {
  const organizationName = reservation.organizationName?.trim();
  if (organizationName) {
    /**
     * Output:
     * @returns string — Nombre de la organización
     */
    return organizationName;
  }
  /**
   * Output:
   * @returns string — Nombre de la sede o fallback
   */
  return reservation.establishmentName.trim() || "Sede";
}

/**
 * Propósito: Allowlist del filtro de estado desde la URL o el cliente.
 */
export function parseInboxStatusFilter(raw: string | undefined): InboxStatusFilter {
  /**
   * Output:
   * @returns InboxStatusFilter — "actionable" si el valor no está en la allowlist
   */
  return INBOX_STATUS_FILTERS.find((status) => status === raw) ?? "actionable";
}

/**
 * Propósito: Allowlist del filtro de ventana temporal.
 */
export function parseInboxWindowFilter(raw: string | undefined): InboxWindowFilter {
  /**
   * Output:
   * @returns InboxWindowFilter — "upcoming" si el valor no está en la allowlist
   */
  return INBOX_WINDOW_FILTERS.find((window) => window === raw) ?? "upcoming";
}

/**
 * Propósito: Normaliza `?tenant=` a clave org:/est: o "all". Rechaza valores inventados.
 */
export function parseInboxTenantKey(raw: string | undefined): string {
  if (!raw || raw === "all") {
    /**
     * Output:
     * @returns string — "all" cuando no hay filtro
     */
    return "all";
  }
  if (/^org:\d+$/.test(raw) || /^est:\d+$/.test(raw)) {
    /**
     * Output:
     * @returns string — Clave ya canónica
     */
    return raw;
  }
  const organizationId = Number(raw);
  if (Number.isInteger(organizationId) && organizationId > 0) {
    /**
     * Output:
     * @returns string — Clave de organización desde un id suelto
     */
    return `org:${organizationId}`;
  }
  /**
   * Output:
   * @returns string — "all" si el parámetro es inválido (fail-safe, no 500)
   */
  return "all";
}

/**
 * Propósito: Arma el tablero: tenants, KPIs, canchas y grupos día/tenant en pasadas O(n).
 * Precarga índices con Map para no reescanear al agrupar.
 */
export function buildReservationInbox(
  reservations: ReservationView[],
  filters: ReservationInboxFilters,
  now: Date,
): ReservationInbox {
  const nowMs = now.getTime();
  const todayKey = toCivilDate(now.toISOString());
  const tenantKey = filters.tenantKey === "all" ? "all" : parseInboxTenantKey(filters.tenantKey);
  const statusFilter = parseInboxStatusFilter(filters.status);
  const windowFilter = parseInboxWindowFilter(filters.window);
  const fieldId =
    Number.isInteger(filters.fieldId) && (filters.fieldId ?? 0) > 0 ? filters.fieldId : null;
  const query = filters.query.trim().toLowerCase().slice(0, MAX_SEARCH_LENGTH);

  const tenantsByKey = new Map<string, ReservationTenantOption>();
  const scopedReservations: ReservationView[] = [];

  for (const reservation of reservations) {
    const key = reservationTenantKey(reservation);
    const tenant = tenantsByKey.get(key);
    if (tenant) {
      tenant.totalCount += 1;
      if (reservation.status === "pending") tenant.pendingCount += 1;
      if (
        reservation.establishmentName &&
        !tenant.establishmentNames.includes(reservation.establishmentName)
      ) {
        tenant.establishmentNames.push(reservation.establishmentName);
      }
    } else {
      tenantsByKey.set(key, {
        key,
        organizationId: reservation.organizationId,
        label: reservationTenantLabel(reservation),
        establishmentNames: reservation.establishmentName ? [reservation.establishmentName] : [],
        totalCount: 1,
        pendingCount: reservation.status === "pending" ? 1 : 0,
      });
    }
    if (tenantKey === "all" || key === tenantKey) {
      scopedReservations.push(reservation);
    }
  }

  const tenants = [...tenantsByKey.values()].sort((left, right) => {
    if (right.pendingCount !== left.pendingCount) return right.pendingCount - left.pendingCount;
    return left.label.localeCompare(right.label, "es");
  });

  const summary = summarizeReservations(scopedReservations, nowMs, todayKey);
  const fields = listFieldOptions(scopedReservations);
  const visibleReservations: ReservationView[] = [];
  let hiddenCancelledCount = 0;

  for (const reservation of scopedReservations) {
    if (!matchesWindowFilter(reservation, windowFilter, nowMs, todayKey)) continue;
    if (fieldId && reservation.fieldId !== fieldId) continue;
    if (query && !matchesQuery(reservation, query)) continue;
    if (!matchesStatusFilter(reservation, statusFilter)) {
      if (reservation.status === "cancelled") hiddenCancelledCount += 1;
      continue;
    }
    visibleReservations.push(reservation);
  }

  /**
   * Output:
   * @returns ReservationInbox — Tablero listo para pintar
   *   - tenants: ReservationTenantOption[] — Filtro por organización/sede
   *   - fields: ReservationFieldOption[] — Canchas del recorte actual
   *   - summary: ReservationInboxSummary — KPIs del tenant (sin filtro de estado)
   *   - groups: ReservationTenantGroup[] — Agenda agrupada por tenant y día
   *   - visibleCount: number — Filas que pasan todos los filtros
   *   - hiddenCancelledCount: number — Canceladas ocultas por el filtro Activas
   */
  return {
    tenants,
    fields,
    summary,
    groups: groupVisibleReservations(visibleReservations, windowFilter),
    visibleCount: visibleReservations.length,
    hiddenCancelledCount,
  };
}

/**
 * Propósito: KPIs del recorte por tenant, independientes del filtro de estado/ventana.
 */
function summarizeReservations(
  reservations: ReservationView[],
  nowMs: number,
  todayKey: string,
): ReservationInboxSummary {
  if (reservations.length === 0) {
    /**
     * Output:
     * @returns ReservationInboxSummary — Ceros cuando no hay reservas del tenant
     */
    return EMPTY_SUMMARY;
  }

  const summary: ReservationInboxSummary = { ...EMPTY_SUMMARY, total: reservations.length };
  for (const reservation of reservations) {
    if (reservation.status === "pending") summary.pending += 1;
    if (reservation.status === "cancelled") summary.cancelled += 1;
    if (reservation.status === "confirmed" && new Date(reservation.endTime).getTime() >= nowMs) {
      summary.confirmedUpcoming += 1;
    }
    if (toCivilDate(reservation.startTime) === todayKey) summary.today += 1;
    if (ACTIONABLE_STATUSES.has(reservation.status)) {
      summary.activeRevenue += reservation.priceEstimate;
    }
  }
  /**
   * Output:
   * @returns ReservationInboxSummary — Conteos e ingreso de reservas activas
   */
  return summary;
}

/**
 * Propósito: Canchas distintas del recorte, ordenadas, con Map para no duplicar en O(n).
 */
function listFieldOptions(reservations: ReservationView[]): ReservationFieldOption[] {
  const fieldsById = new Map<number, ReservationFieldOption>();
  for (const reservation of reservations) {
    if (!fieldsById.has(reservation.fieldId)) {
      fieldsById.set(reservation.fieldId, {
        fieldId: reservation.fieldId,
        fieldName: reservation.fieldName,
      });
    }
  }
  /**
   * Output:
   * @returns ReservationFieldOption[] — Canchas para el filtro secundario
   */
  return [...fieldsById.values()].sort((left, right) =>
    left.fieldName.localeCompare(right.fieldName, "es"),
  );
}

/**
 * Propósito: Aplica el chip de estado. "actionable" oculta canceladas y completadas.
 */
function matchesStatusFilter(
  reservation: ReservationView,
  statusFilter: InboxStatusFilter,
): boolean {
  if (statusFilter === "all") {
    /**
     * Output:
     * @returns boolean — True, no se filtra por estado
     */
    return true;
  }
  if (statusFilter === "actionable") {
    /**
     * Output:
     * @returns boolean — True si está pendiente o confirmada
     */
    return ACTIONABLE_STATUSES.has(reservation.status);
  }
  /**
   * Output:
   * @returns boolean — True si coincide el estado pedido
   */
  return reservation.status === statusFilter && RESERVATION_STATUSES.includes(reservation.status);
}

/**
 * Propósito: Filtra por ventana civil/instante: próximas, hoy, pasadas o todas.
 */
function matchesWindowFilter(
  reservation: ReservationView,
  windowFilter: InboxWindowFilter,
  nowMs: number,
  todayKey: string,
): boolean {
  if (windowFilter === "all") {
    /**
     * Output:
     * @returns boolean — True, no se recorta por tiempo
     */
    return true;
  }
  if (windowFilter === "today") {
    /**
     * Output:
     * @returns boolean — True si el partido cae en el día civil actual
     */
    return toCivilDate(reservation.startTime) === todayKey;
  }
  const endsAt = new Date(reservation.endTime).getTime();
  if (windowFilter === "upcoming") {
    /**
     * Output:
     * @returns boolean — True si el horario aún no terminó
     */
    return endsAt >= nowMs;
  }
  /**
   * Output:
   * @returns boolean — True si el horario ya cerró
   */
  return endsAt < nowMs;
}

/**
 * Propósito: Búsqueda local en cancha, sede, tenant, notas e id de jugador.
 */
function matchesQuery(reservation: ReservationView, query: string): boolean {
  const haystack = [
    reservation.fieldName,
    reservation.establishmentName,
    reservation.organizationName ?? "",
    reservation.notes ?? "",
    `jugador #${reservation.userId}`,
    String(reservation.userId),
  ]
    .join(" ")
    .toLowerCase();
  /**
   * Output:
   * @returns boolean — True si algún campo contiene el texto
   */
  return haystack.includes(query);
}

/**
 * Propósito: Agrupa lo visible por tenant y luego por día civil, ordenado para leer como agenda.
 */
function groupVisibleReservations(
  reservations: ReservationView[],
  windowFilter: InboxWindowFilter,
): ReservationTenantGroup[] {
  const groupsByKey = new Map<string, ReservationTenantGroup>();
  const dayBuckets = new Map<string, Map<string, ReservationView[]>>();

  for (const reservation of reservations) {
    const key = reservationTenantKey(reservation);
    let group = groupsByKey.get(key);
    if (!group) {
      group = {
        key,
        organizationId: reservation.organizationId,
        label: reservationTenantLabel(reservation),
        establishmentNames: [],
        pendingCount: 0,
        totalCount: 0,
        dayGroups: [],
      };
      groupsByKey.set(key, group);
      dayBuckets.set(key, new Map());
    }
    group.totalCount += 1;
    if (reservation.status === "pending") group.pendingCount += 1;
    if (
      reservation.establishmentName &&
      !group.establishmentNames.includes(reservation.establishmentName)
    ) {
      group.establishmentNames.push(reservation.establishmentName);
    }
    const dayKey = toCivilDate(reservation.startTime);
    const days = dayBuckets.get(key);
    if (!days) continue;
    const dayReservations = days.get(dayKey);
    if (dayReservations) dayReservations.push(reservation);
    else days.set(dayKey, [reservation]);
  }

  const dayDirection = windowFilter === "past" ? -1 : 1;
  /**
   * Output:
   * @returns ReservationTenantGroup[] — Tenants con días y reservas ordenadas
   */
  return [...groupsByKey.values()]
    .map((group) => {
      const days = dayBuckets.get(group.key) ?? new Map<string, ReservationView[]>();
      return {
        ...group,
        dayGroups: [...days.entries()]
          .sort(([left], [right]) => left.localeCompare(right) * dayDirection)
          .map(([dayKey, dayReservations]) => ({
            dayKey,
            reservations: dayReservations.toSorted(
              (left, right) =>
                new Date(left.startTime).getTime() - new Date(right.startTime).getTime(),
            ),
          })),
      };
    })
    .sort((left, right) => {
      if (right.pendingCount !== left.pendingCount) return right.pendingCount - left.pendingCount;
      return left.label.localeCompare(right.label, "es");
    });
}
