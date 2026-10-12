"use client";

import { COURT_STATUS_KEYS } from "@/core/i18n/label-keys";
import type { MessageKey } from "@/core/i18n/messages";
import { useI18n } from "@/core/i18n/provider";
import type { TranslateFn } from "@/core/i18n/translate";
import type { VenueMapEstablishment, VenueMapField } from "@/application/venue-map";
import { BOOKING_CLOSE_HOUR, BOOKING_OPEN_HOUR } from "@/domain/booking";
import {
  OPERATING_HOURS_PER_DAY,
  formatHourOfDay,
  isCourtOccupied,
  toLocalHourOfDay,
  type CourtSnapshot,
  type OccupancyReservation,
  type VenueOccupancySummary,
} from "@/domain/venue-occupancy";
import { COURT_STATUS_PRESENTATION } from "@/features/admin/venue-map/court-status";
import type { PlacedCourt } from "@/features/admin/venue-map/isometric-venue";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/money";
import Link from "next/link";
import { useState } from "react";

const PANEL_CLASS_NAME =
  "rounded-2xl border border-white/10 bg-ink/85 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-md";

const HOUR_TICK_STEP = 2;

/**
 * Propósito: Convierte una hora local en % horizontal del horario operable para la línea de tiempo.
 */
function toTimelinePercent(hourOfDay: number): number {
  const clampedHour = Math.min(BOOKING_CLOSE_HOUR, Math.max(BOOKING_OPEN_HOUR, hourOfDay));
  /**
   * Output:
   * @returns number — 0..100
   */
  return ((clampedHour - BOOKING_OPEN_HOUR) / OPERATING_HOURS_PER_DAY) * 100;
}

/**
 * Propósito: Rango "HH:MM – HH:MM" de una reserva en hora local.
 */
function formatReservationRange(reservation: OccupancyReservation): string {
  /**
   * Output:
   * @returns string — Rango local legible
   */
  return `${formatHourOfDay(toLocalHourOfDay(reservation.startTime))} – ${formatHourOfDay(
    toLocalHourOfDay(reservation.endTime),
  )}`;
}

/**
 * Propósito: Chip con punto de color del estado en vivo de una cancha.
 */
function CourtStatusChip({ snapshot }: { snapshot: Pick<CourtSnapshot, "status"> }) {
  const { t } = useI18n();
  const presentation = COURT_STATUS_PRESENTATION[snapshot.status];
  const statusLabel = t(COURT_STATUS_KEYS[snapshot.status]);
  /**
   * Output:
   * @returns JSX.Element — Chip de estado
   */
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        presentation.chipClassName,
      )}
    >
      <span className={cn("size-1.5 rounded-full", presentation.dotClassName)} />
      {statusLabel}
    </span>
  );
}

/**
 * Propósito: Barra de progreso fina reutilizada en KPIs, partidos y ocupación.
 */
function ProgressBar({ ratio, className }: { ratio: number; className?: string }) {
  /**
   * Output:
   * @returns JSX.Element — Barra 0..100%
   */
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={cn("h-full rounded-full bg-lime transition-[width] duration-500", className)}
        style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }}
      />
    </div>
  );
}

/**
 * Propósito: Tarjetas KPI superiores: canchas en juego, reservas del día y ocupación.
 */
export function VenueKpiStrip({
  summary,
  referenceLabel,
}: {
  summary: VenueOccupancySummary;
  referenceLabel: string;
}) {
  const { t } = useI18n();
  const kpis = [
    {
      label: t("venueMap.kpiCourtsInPlay"),
      value: `${summary.occupiedCourtCount}`,
      suffix: `/ ${summary.courtCount}`,
      hint: referenceLabel,
      glyph: "◉",
    },
    {
      label: t("venueMap.kpiDayReservations"),
      value: `${summary.reservationCount}`,
      suffix: "",
      hint: t("venueMap.kpiPendingConfirm", { count: summary.pendingReservationCount }),
      glyph: "▦",
    },
    {
      label: t("venueMap.kpiDayOccupancy"),
      value: `${Math.round(summary.occupancyRatio * 100)}%`,
      suffix: "",
      hint: t("venueMap.kpiBookedHours", { hours: summary.bookedHours.toFixed(1) }),
      glyph: "◔",
    },
  ];

  /**
   * Output:
   * @returns JSX.Element — Fila de 3 KPIs
   */
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:absolute lg:left-4 lg:top-4 lg:z-10 lg:flex">
      {kpis.map((kpi) => (
        <div key={kpi.label} className={cn(PANEL_CLASS_NAME, "flex items-center gap-3 px-3.5 py-3 lg:w-[178px]")}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime/12 text-lg text-lime">
            {kpi.glyph}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] text-mist">{kpi.label}</p>
            <p className="font-display text-2xl leading-tight text-bone">
              {kpi.value}
              {kpi.suffix ? <span className="ml-1 text-sm text-mist">{kpi.suffix}</span> : null}
            </p>
            <p className="truncate text-[10px] text-mist/80">{kpi.hint}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface VenueMapPermissions {
  canManageFields: boolean;
  canViewReservations: boolean;
}

/**
 * Propósito: Panel lateral con la sede (selector, métricas) y el detalle de la cancha seleccionada.
 */
export function VenueDetailPanel({
  establishments,
  selectedEstablishment,
  onSelectEstablishment,
  summary,
  dayRevenue,
  isOpenAtReference,
  selectedCourt,
  createCourtHref,
  permissions,
}: {
  establishments: VenueMapEstablishment[];
  selectedEstablishment: VenueMapEstablishment;
  onSelectEstablishment: (establishmentId: number) => void;
  summary: VenueOccupancySummary;
  dayRevenue: number;
  isOpenAtReference: boolean;
  selectedCourt: PlacedCourt | null;
  createCourtHref: string | null;
  permissions: VenueMapPermissions;
}) {
  const { t, intlLocale } = useI18n();
  const consultLabel = t("common.consult");
  const freeCourtCount = summary.courtCount - summary.occupiedCourtCount;

  /**
   * Output:
   * @returns JSX.Element — Panel de sede + cancha
   */
  return (
    <aside
      className={cn(
        PANEL_CLASS_NAME,
        "space-y-4 p-4 lg:absolute lg:right-4 lg:top-4 lg:bottom-[212px] lg:z-10 lg:w-[328px] lg:overflow-y-auto",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-lime text-xl font-bold text-ink">
          ⚽
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-lime">
            {t("venueMap.venueKicker")}
          </p>
          {establishments.length > 1 ? (
            <select
              aria-label={t("venueMap.selectVenue")}
              value={selectedEstablishment.establishmentId}
              onChange={(event) => onSelectEstablishment(Number(event.target.value))}
              className="mt-0.5 w-full truncate rounded-lg bg-transparent font-display text-lg text-bone outline-none focus-visible:ring-2 focus-visible:ring-lime"
            >
              {establishments.map((establishment) => (
                <option
                  key={establishment.establishmentId}
                  value={establishment.establishmentId}
                  className="bg-ink text-base"
                >
                  {establishment.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-0.5 truncate font-display text-lg text-bone">{selectedEstablishment.name}</p>
          )}
          <p className="truncate text-xs text-mist">{selectedEstablishment.address}</p>
        </div>
        {createCourtHref ? (
          <Link
            href={createCourtHref}
            title={t("venueMap.addCourt")}
            aria-label={t("venueMap.addCourtAria")}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/12 text-lg text-bone hover:border-lime/50 hover:text-lime"
          >
            +
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-mist">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 font-semibold",
            isOpenAtReference ? "bg-lime/15 text-lime" : "bg-white/8 text-mist",
          )}
        >
          {isOpenAtReference ? t("venueMap.openNow") : t("venueMap.closedNow")}
        </span>
        <span>
          {t("venueMap.inPlayFree", {
            occupied: summary.occupiedCourtCount,
            free: freeCourtCount,
          })}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-mist">
          <span>{t("venueMap.kpiDayOccupancy")}</span>
          <span className="text-bone">{Math.round(summary.occupancyRatio * 100)}%</span>
        </div>
        <ProgressBar ratio={summary.occupancyRatio} className="mt-1.5" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-[11px] text-mist">{t("venueMap.estimatedRevenue")}</p>
          <p className="mt-1 truncate font-display text-base text-bone">
            {formatMoney(dayRevenue, intlLocale, consultLabel)}
          </p>
        </div>
        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-[11px] text-mist">{t("venueMap.pendingConfirmShort")}</p>
          <p className="mt-1 font-display text-xl text-clay">{summary.pendingReservationCount}</p>
        </div>
      </div>

      {selectedCourt ? (
        <SelectedCourtDetail
          field={selectedCourt.field}
          snapshot={selectedCourt.snapshot}
          permissions={permissions}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-white/12 p-4 text-center text-sm text-mist">
          {permissions.canManageFields
            ? t("venueMap.noCourtsHintMap")
            : t("venueMap.noCourtsHint")}
        </p>
      )}
    </aside>
  );
}

/**
 * Propósito: Ficha de la cancha seleccionada con partido actual, siguiente y accesos rápidos.
 */
function SelectedCourtDetail({
  field,
  snapshot,
  permissions,
}: {
  field: VenueMapField;
  snapshot: CourtSnapshot;
  permissions: VenueMapPermissions;
}) {
  const { t, intlLocale } = useI18n();
  /**
   * Output:
   * @returns JSX.Element — Detalle de cancha
   */
  return (
    <div className="space-y-3 border-t border-white/8 pt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-lg text-bone">
            {t("venueMap.courtHeading", { number: field.numberField })}
          </p>
          <p className="text-xs text-mist">
            {formatMoney(field.basePricePerHour, intlLocale, t("common.consult"))} {t("catalog.perHour")}
          </p>
        </div>
        <CourtStatusChip snapshot={snapshot} />
      </div>
      {field.description ? (
        <p className="line-clamp-2 text-xs leading-5 text-mist">{field.description}</p>
      ) : null}

      {snapshot.currentReservation ? (
        <div className="rounded-xl bg-white/5 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-mist">
              {t("venueMap.reservationHash", { id: snapshot.currentReservation.reservationId })}
            </span>
            <span className="font-semibold text-bone">
              {formatReservationRange(snapshot.currentReservation)}
            </span>
          </div>
          <ProgressBar ratio={snapshot.matchProgress} className="mt-2" />
          <p className="mt-1.5 text-[11px] text-mist">
            {t("venueMap.matchProgress", {
              percent: Math.round(snapshot.matchProgress * 100),
            })}
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between text-xs text-mist">
        <span>{t("venueMap.nextLabel")}</span>
        <span className="text-bone">
          {snapshot.nextReservation
            ? t("venueMap.rangeInDuration", {
                range: formatReservationRange(snapshot.nextReservation),
                duration: formatMinutes(snapshot.minutesUntilNext ?? 0, t),
              })
            : t("venueMap.noMoreReservations")}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-mist">
        <span>{t("venueMap.bookedToday")}</span>
        <span className="text-bone">
          {t("venueMap.bookedTodayValue", {
            hours: snapshot.bookedHours.toFixed(1),
            count: snapshot.reservationCount,
          })}
        </span>
      </div>

      {permissions.canManageFields || permissions.canViewReservations ? (
        <div className="flex gap-2 pt-1">
          {permissions.canManageFields ? (
            <Link
              href={`/admin/canchas/${field.id}`}
              className="flex-1 rounded-full border border-white/12 px-3 py-2 text-center text-xs font-semibold text-bone hover:border-lime/50"
            >
              {t("venueMap.editCourtLink")}
            </Link>
          ) : null}
          {permissions.canViewReservations ? (
            <Link
              href="/admin/reservas"
              className="flex-1 rounded-full bg-lime px-3 py-2 text-center text-xs font-semibold text-ink hover:bg-flare"
            >
              {t("venueMap.viewReservationsLink")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Propósito: Formatea minutos como "45 min" o "1 h 20 min".
 */
function formatMinutes(totalMinutes: number, t: TranslateFn): string {
  if (totalMinutes < 60) {
    /**
     * Output:
     * @returns string — Minutos
     */
    return t("venueMap.minutesOnly", { minutes: totalMinutes });
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  /**
   * Output:
   * @returns string — Horas y minutos
   */
  return minutes
    ? t("venueMap.hoursMinutes", { hours, minutes })
    : t("venueMap.hoursOnly", { hours });
}

/**
 * Propósito: Línea de tiempo del día: mapa de calor de la sede, bloques de la cancha seleccionada
 * y un scrubber para ver el complejo a cualquier hora. Incluye navegación entre días.
 */
export function DayTimelinePanel({
  dayIsoDate,
  isToday,
  isLive,
  referenceHour,
  onScrubHour,
  onGoLive,
  onChangeDay,
  hourlyOccupancy,
  courtCount,
  selectedCourt,
  selectedCourtReservations,
}: {
  dayIsoDate: string;
  isToday: boolean;
  isLive: boolean;
  referenceHour: number;
  onScrubHour: (hourOfDay: number) => void;
  onGoLive: () => void;
  onChangeDay: (dayOffsetOrIsoDate: number | string) => void;
  hourlyOccupancy: number[];
  courtCount: number;
  selectedCourt: PlacedCourt | null;
  selectedCourtReservations: OccupancyReservation[];
}) {
  const { t } = useI18n();
  const hourTicks = Array.from(
    { length: OPERATING_HOURS_PER_DAY / HOUR_TICK_STEP + 1 },
    (_, tickIndex) => BOOKING_OPEN_HOUR + tickIndex * HOUR_TICK_STEP,
  ).filter((hour) => hour <= BOOKING_CLOSE_HOUR);

  /**
   * Output:
   * @returns JSX.Element — Panel de agenda con scrubber
   */
  return (
    <section
      className={cn(
        PANEL_CLASS_NAME,
        "flex flex-col gap-3 p-4 lg:absolute lg:bottom-4 lg:left-4 lg:right-[360px] lg:z-10",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base text-bone">{t("venueMap.dayAgenda")}</h3>
          {selectedCourt ? (
            <span className="text-xs text-mist">
              {t("venueMap.courtDot", { number: selectedCourt.field.numberField })}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={t("venueMap.previousDay")}
            onClick={() => onChangeDay(-1)}
            className="flex size-7 items-center justify-center rounded-lg border border-white/10 text-bone hover:border-lime/50"
          >
            ‹
          </button>
          <input
            type="date"
            aria-label={t("venueMap.pickDay")}
            value={dayIsoDate}
            onChange={(event) => event.target.value && onChangeDay(event.target.value)}
            className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-xs text-bone [color-scheme:dark] focus-visible:outline-2 focus-visible:outline-lime"
          />
          <button
            type="button"
            aria-label={t("venueMap.nextDay")}
            onClick={() => onChangeDay(1)}
            className="flex size-7 items-center justify-center rounded-lg border border-white/10 text-bone hover:border-lime/50"
          >
            ›
          </button>
          {isToday ? (
            <button
              type="button"
              onClick={onGoLive}
              disabled={isLive}
              className={cn(
                "ml-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                isLive ? "bg-lime/15 text-lime" : "bg-white/8 text-bone hover:bg-white/14",
              )}
            >
              <span className={cn("size-1.5 rounded-full bg-lime", isLive && "animate-iso-glow")} />
              {isLive ? t("venueMap.live") : t("venueMap.backToNow")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative mt-4">
        <div className="flex h-2 gap-px overflow-hidden rounded-full" aria-hidden>
          {hourlyOccupancy.map((busyCourtCount, slotIndex) => (
            <div
              key={slotIndex}
              className="flex-1 bg-lime"
              style={{ opacity: 0.08 + (courtCount ? busyCourtCount / courtCount : 0) * 0.85 }}
              title={`${formatHourOfDay(BOOKING_OPEN_HOUR + slotIndex)} · ${busyCourtCount}/${courtCount} canchas`}
            />
          ))}
        </div>

        <div className="relative mt-2 h-9 rounded-lg bg-white/5">
          {selectedCourtReservations.map((reservation) => {
            const leftPercent = toTimelinePercent(toLocalHourOfDay(reservation.startTime));
            const rightPercent = toTimelinePercent(toLocalHourOfDay(reservation.endTime));
            return (
              <div
                key={reservation.reservationId}
                className={cn(
                  "absolute inset-y-1 flex items-center overflow-hidden rounded-md px-1.5 text-[10px] font-semibold",
                  reservation.status === "pending"
                    ? "bg-clay/80 text-ink"
                    : reservation.status === "completed"
                      ? "bg-mist/40 text-ink"
                      : "bg-lime text-ink",
                )}
                style={{ left: `${leftPercent}%`, width: `${Math.max(1, rightPercent - leftPercent)}%` }}
              >
                <span className="truncate">#{reservation.reservationId}</span>
              </div>
            );
          })}
        </div>

        <div className="relative mt-1 h-4 text-[10px] text-mist" aria-hidden>
          {hourTicks.map((hour, tickIndex) => (
            <span
              key={hour}
              className={cn("absolute -translate-x-1/2", tickIndex % 2 === 1 && "max-sm:hidden")}
              style={{ left: `${toTimelinePercent(hour)}%` }}
            >
              {formatHourOfDay(hour)}
            </span>
          ))}
        </div>

        <div
          className="pointer-events-none absolute -top-1 bottom-4 w-0.5 -translate-x-1/2 rounded-full bg-bone shadow-[0_0_10px_rgba(244,239,228,0.8)]"
          style={{ left: `${toTimelinePercent(referenceHour)}%` }}
          aria-hidden
        >
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-bone px-1.5 py-0.5 text-[10px] font-bold text-ink">
            {formatHourOfDay(referenceHour)}
          </span>
        </div>

        <input
          type="range"
          aria-label={t("venueMap.pickHour")}
          aria-valuetext={formatHourOfDay(referenceHour)}
          min={BOOKING_OPEN_HOUR}
          max={BOOKING_CLOSE_HOUR}
          step={0.25}
          value={Math.min(BOOKING_CLOSE_HOUR, Math.max(BOOKING_OPEN_HOUR, referenceHour))}
          onChange={(event) => onScrubHour(Number(event.target.value))}
          className="absolute inset-x-0 -top-1 bottom-4 w-full cursor-ew-resize opacity-0"
        />
      </div>
    </section>
  );
}

type CourtListFilter = "all" | "occupied" | "free";

const COURT_LIST_FILTERS: Array<{ id: CourtListFilter; labelKey: MessageKey }> = [
  { id: "all", labelKey: "venueMap.filterAll" },
  { id: "occupied", labelKey: "venueMap.filterOccupied" },
  { id: "free", labelKey: "venueMap.filterFree" },
];

/**
 * Propósito: Desglose de canchas por estado (todas / en juego / libres) con selección en el mapa.
 */
export function CourtListPanel({
  courts,
  selectedFieldId,
  onSelectField,
}: {
  courts: PlacedCourt[];
  selectedFieldId: number | null;
  onSelectField: (fieldId: number) => void;
}) {
  const { t } = useI18n();
  const [activeFilter, setActiveFilter] = useState<CourtListFilter>("all");
  const occupiedCourts = courts.filter((court) => isCourtOccupied(court.snapshot));
  const freeCourts = courts.filter((court) => !isCourtOccupied(court.snapshot));
  const courtsByFilter: Record<CourtListFilter, PlacedCourt[]> = {
    all: courts,
    occupied: occupiedCourts,
    free: freeCourts,
  };
  const visibleCourts = courtsByFilter[activeFilter];

  /**
   * Output:
   * @returns JSX.Element — Lista filtrable de canchas
   */
  return (
    <section
      className={cn(
        PANEL_CLASS_NAME,
        "flex flex-col p-3 lg:absolute lg:bottom-4 lg:right-4 lg:z-10 lg:h-[184px] lg:w-[328px]",
      )}
    >
      <div role="tablist" aria-label={t("venueMap.filterCourts")} className="flex gap-1 rounded-xl bg-white/5 p-1">
        {COURT_LIST_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={activeFilter === filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              "flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition",
              activeFilter === filter.id ? "bg-bone text-ink" : "text-mist hover:text-bone",
            )}
          >
            {t(filter.labelKey)} <span className="opacity-60">{courtsByFilter[filter.id].length}</span>
          </button>
        ))}
      </div>

      <ul className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
        {visibleCourts.length === 0 ? (
          <li className="py-6 text-center text-xs text-mist">{t("venueMap.noCourtsInFilter")}</li>
        ) : (
          visibleCourts.map(({ field, snapshot }) => (
            <li key={field.id}>
              <button
                type="button"
                onClick={() => onSelectField(field.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition",
                  field.id === selectedFieldId ? "bg-white/10" : "hover:bg-white/5",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-bone">
                    {t("venueMap.courtHeading", { number: field.numberField })}
                  </p>
                  <p className="truncate text-[11px] text-mist">{describeCourtRow(snapshot, t)}</p>
                </div>
                <div className="flex w-[104px] flex-col items-end gap-1">
                  <CourtStatusChip snapshot={snapshot} />
                  {snapshot.currentReservation ? <ProgressBar ratio={snapshot.matchProgress} /> : null}
                </div>
                <span aria-hidden className="text-mist">›</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

/**
 * Propósito: Subtítulo de cada fila del desglose según el estado de la cancha.
 */
function describeCourtRow(snapshot: CourtSnapshot, t: TranslateFn): string {
  if (snapshot.currentReservation) {
    /**
     * Output:
     * @returns string — Rango del partido en curso
     */
    return t("venueMap.matchRange", {
      range: formatReservationRange(snapshot.currentReservation),
    });
  }
  if (snapshot.nextReservation) {
    /**
     * Output:
     * @returns string — Próxima reserva y cuánto falta
     */
    return t("venueMap.upcomingAt", {
      hour: formatHourOfDay(toLocalHourOfDay(snapshot.nextReservation.startTime)),
      duration: formatMinutes(snapshot.minutesUntilNext ?? 0, t),
    });
  }
  /**
   * Output:
   * @returns string — Sin reservas pendientes
   */
  return t("venueMap.availableRestOfDay");
}
