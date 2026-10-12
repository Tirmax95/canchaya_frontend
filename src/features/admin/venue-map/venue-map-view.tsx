"use client";

import { useI18n } from "@/core/i18n/provider";
import type { VenueMapData } from "@/application/venue-map";
import { BOOKING_CLOSE_HOUR, BOOKING_OPEN_HOUR } from "@/domain/booking";
import {
  buildCourtSnapshot,
  buildHourlyOccupancy,
  estimateDayRevenue,
  findPeakHour,
  formatHourOfDay,
  groupActiveReservationsByField,
  isCourtOccupied,
  isIsoCalendarDate,
  localHourToDate,
  shiftIsoCalendarDate,
  summarizeVenueOccupancy,
  toLocalHourOfDay,
  type OccupancyReservation,
} from "@/domain/venue-occupancy";
import { IsometricVenue, type PlacedCourt } from "@/features/admin/venue-map/isometric-venue";
import {
  CourtListPanel,
  DayTimelinePanel,
  VenueDetailPanel,
  VenueKpiStrip,
  type VenueMapPermissions,
} from "@/features/admin/venue-map/venue-map-panels";
import { useFullscreen } from "@/features/admin/venue-map/use-fullscreen";
import { withDayParam } from "@/features/admin/venue-map/view-mode";
import { cn } from "@/shared/lib/cn";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const LIVE_CLOCK_TICK_MS = 30_000;
const LIVE_DATA_REFRESH_MS = 60_000;
const NO_RESERVATIONS: OccupancyReservation[] = [];

/**
 * Propósito: Reloj que avanza solo en modo en vivo. Arranca en el instante del render del
 * servidor para que SSR e hidratación pinten el mismo estado.
 */
function useLiveClock(renderedAtIso: string, isLive: boolean): number {
  const [nowMs, setNowMs] = useState(() => Date.parse(renderedAtIso));

  useEffect(() => {
    if (!isLive) {
      return;
    }
    const syncNow = () => setNowMs(Date.now());
    const firstTick = window.setTimeout(syncNow, 0);
    const intervalId = window.setInterval(syncNow, LIVE_CLOCK_TICK_MS);
    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(intervalId);
    };
  }, [isLive]);

  /**
   * Output:
   * @returns number — Epoch ms actual (congelado fuera de modo en vivo)
   */
  return nowMs;
}

/**
 * Propósito: Revalida los datos del servidor periódicamente mientras la pestaña está visible,
 * para reflejar reservas nuevas o confirmadas sin recargar la página.
 */
function usePeriodicServerRefresh(isEnabled: boolean): void {
  const router = useRouter();

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, LIVE_DATA_REFRESH_MS);
    /**
     * Output:
     * Side effects — Limpia el intervalo al desmontar o salir de "hoy"
     */
    return () => window.clearInterval(intervalId);
  }, [isEnabled, router]);
}

/**
 * Propósito: Orquesta el mapa 3D del complejo: elige sede y cancha, define el instante a
 * visualizar (en vivo o scrubbing) y deriva snapshots/KPIs con funciones puras de dominio.
 * Agrupa reservas por cancha una sola vez (Map) para que cada repintado sea O(reservas).
 */
export function VenueMapView({
  data,
  dayNavigationBaseHref,
  permissions,
}: {
  data: VenueMapData;
  /** Ruta a la que se añade `?fecha=` al cambiar de día (dashboard o vista mapa de canchas). */
  dayNavigationBaseHref: string;
  /** Módulos habilitados para el tenant: ocultan accesos a páginas no permitidas. */
  permissions: VenueMapPermissions;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const {
    targetRef: fullscreenTargetRef,
    isFullscreen,
    isOverlayFullscreen,
    toggleFullscreen,
  } = useFullscreen<HTMLElement>();
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState(
    () => pickInitialEstablishmentId(data),
  );
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [scrubHour, setScrubHour] = useState<number | null>(() =>
    data.isToday ? null : findPeakHour(buildHourlyOccupancy(data.reservations, data.dayIsoDate)),
  );
  const isLive = data.isToday && scrubHour === null;
  const nowMs = useLiveClock(data.renderedAtIso, isLive);
  usePeriodicServerRefresh(data.isToday);

  const reservationsByField = useMemo(
    () => groupActiveReservationsByField(data.reservations),
    [data.reservations],
  );

  const selectedEstablishment =
    data.establishments.find(
      (establishment) => establishment.establishmentId === selectedEstablishmentId,
    ) ?? data.establishments[0];

  const venueFields = useMemo(
    () =>
      data.fields
        .filter((field) => field.establishmentId === selectedEstablishment?.establishmentId)
        .sort((left, right) =>
          left.numberField.localeCompare(right.numberField, "es", { numeric: true }),
        ),
    [data.fields, selectedEstablishment?.establishmentId],
  );

  const referenceInstant =
    scrubHour === null ? new Date(nowMs) : localHourToDate(data.dayIsoDate, scrubHour);
  const referenceInstantMs = referenceInstant.getTime();
  const referenceHour =
    scrubHour ?? toLocalHourOfDay(referenceInstant);

  const courts: PlacedCourt[] = useMemo(
    () =>
      venueFields.map((field) => ({
        field,
        snapshot: buildCourtSnapshot(
          field.id,
          reservationsByField.get(field.id) ?? NO_RESERVATIONS,
          new Date(referenceInstantMs),
          data.dayIsoDate,
        ),
      })),
    [venueFields, reservationsByField, referenceInstantMs, data.dayIsoDate],
  );

  const venueDayStats = useMemo(() => {
    const venueReservations = venueFields.flatMap(
      (field) => reservationsByField.get(field.id) ?? NO_RESERVATIONS,
    );
    return {
      hourlyOccupancy: buildHourlyOccupancy(venueReservations, data.dayIsoDate),
      pendingReservationCount: venueReservations.filter(
        (reservation) => reservation.status === "pending",
      ).length,
      dayRevenue: estimateDayRevenue(
        venueReservations,
        new Map(venueFields.map((field) => [field.id, field.basePricePerHour])),
      ),
    };
  }, [venueFields, reservationsByField, data.dayIsoDate]);

  const summary = summarizeVenueOccupancy(
    courts.map((court) => court.snapshot),
    venueDayStats.pendingReservationCount,
  );

  const selectedCourt =
    courts.find((court) => court.field.id === selectedFieldId) ??
    courts.find((court) => isCourtOccupied(court.snapshot)) ??
    courts[0] ??
    null;

  const createCourtHref = !permissions.canManageFields
    ? null
    : selectedEstablishment
      ? `/admin/canchas/nueva?sede=${selectedEstablishment.establishmentId}`
      : "/admin/canchas/nueva";

  /**
   * Propósito: Navega a otro día (offset relativo o fecha absoluta) y recarga datos en servidor.
   */
  function handleChangeDay(dayOffsetOrIsoDate: number | string) {
    const targetDay =
      typeof dayOffsetOrIsoDate === "number"
        ? shiftIsoCalendarDate(data.dayIsoDate, dayOffsetOrIsoDate)
        : dayOffsetOrIsoDate;
    if (!isIsoCalendarDate(targetDay) || targetDay === data.dayIsoDate) {
      return;
    }
    router.push(withDayParam(dayNavigationBaseHref, targetDay), { scroll: false });
  }

  /**
   * Propósito: Al cambiar de sede se limpia la cancha elegida para auto-seleccionar una de la nueva.
   */
  function handleSelectEstablishment(establishmentId: number) {
    setSelectedEstablishmentId(establishmentId);
    setSelectedFieldId(null);
  }

  /**
   * Output:
   * @returns JSX.Element — Mapa isométrico con paneles flotantes (apilados en móvil)
   */
  return (
    <section
      ref={fullscreenTargetRef}
      aria-label={t("venueMap.mapAria")}
      className={cn(
        "relative bg-[linear-gradient(180deg,#0b1710_0%,#08110c_100%)]",
        isFullscreen
          ? "h-dvh w-full overflow-y-auto lg:overflow-hidden"
          : "overflow-hidden rounded-[32px] border border-white/8 lg:h-[max(760px,calc(100dvh-150px))]",
        isOverlayFullscreen && "fixed inset-0 z-[100]",
      )}
    >
      <div
        className={cn(
          "relative lg:absolute lg:inset-0 lg:h-auto",
          isFullscreen ? "h-[72dvh]" : "h-[460px]",
        )}
      >
        <IsometricVenue
          establishment={selectedEstablishment ?? null}
          courts={courts}
          selectedFieldId={selectedCourt?.field.id ?? null}
          onSelectField={setSelectedFieldId}
          createCourtHref={createCourtHref}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>

      <div className="grid gap-3 p-3 lg:contents">
        <VenueKpiStrip
          summary={summary}
          referenceLabel={
            isLive
              ? t("venueMap.referenceLive")
              : t("venueMap.referenceAtHour", { hour: formatHourOfDay(referenceHour) })
          }
        />
        {selectedEstablishment ? (
          <VenueDetailPanel
            establishments={data.establishments}
            selectedEstablishment={selectedEstablishment}
            onSelectEstablishment={handleSelectEstablishment}
            summary={summary}
            dayRevenue={venueDayStats.dayRevenue}
            isOpenAtReference={referenceHour >= BOOKING_OPEN_HOUR && referenceHour < BOOKING_CLOSE_HOUR}
            selectedCourt={selectedCourt}
            createCourtHref={createCourtHref}
            permissions={permissions}
          />
        ) : null}
        <DayTimelinePanel
          dayIsoDate={data.dayIsoDate}
          isToday={data.isToday}
          isLive={isLive}
          referenceHour={referenceHour}
          onScrubHour={setScrubHour}
          onGoLive={() => setScrubHour(null)}
          onChangeDay={handleChangeDay}
          hourlyOccupancy={venueDayStats.hourlyOccupancy}
          courtCount={courts.length}
          selectedCourt={selectedCourt}
          selectedCourtReservations={
            selectedCourt
              ? (reservationsByField.get(selectedCourt.field.id) ?? NO_RESERVATIONS)
              : NO_RESERVATIONS
          }
        />
        <CourtListPanel
          courts={courts}
          selectedFieldId={selectedCourt?.field.id ?? null}
          onSelectField={setSelectedFieldId}
        />
      </div>
    </section>
  );
}

/**
 * Propósito: Abre por defecto la sede con más canchas, que suele ser la operativa principal.
 */
function pickInitialEstablishmentId(data: VenueMapData): number | null {
  const fieldCountByEstablishment = new Map<number, number>();
  for (const field of data.fields) {
    fieldCountByEstablishment.set(
      field.establishmentId,
      (fieldCountByEstablishment.get(field.establishmentId) ?? 0) + 1,
    );
  }
  let busiestEstablishmentId = data.establishments[0]?.establishmentId ?? null;
  for (const establishment of data.establishments) {
    if (
      (fieldCountByEstablishment.get(establishment.establishmentId) ?? 0) >
      (fieldCountByEstablishment.get(busiestEstablishmentId ?? -1) ?? 0)
    ) {
      busiestEstablishmentId = establishment.establishmentId;
    }
  }
  /**
   * Output:
   * @returns number | null — establishmentId inicial, null si no hay sedes
   */
  return busiestEstablishmentId;
}
