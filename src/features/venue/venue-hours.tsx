import { WEEK_DAY_LABEL_KEYS } from "@/core/i18n/label-keys";
import type { TranslateFn } from "@/core/i18n/translate";
import {
  getOpeningHoursForDay,
  isOpenAt,
  WEEK_DAYS_MONDAY_FIRST,
  type OpeningHoursDay,
} from "@/domain/establishment";
import { cn } from "@/shared/lib/cn";
import { getZonedWeekdayAndMinutes } from "@/shared/lib/datetime";

/**
 * Propósito: Estado de apertura actual en la zona horaria de la app.
 */
export function getOpenStatus(
  hours: OpeningHoursDay[],
  now = new Date(),
): { isOpen: boolean | null; today: number; todayHours: OpeningHoursDay | null } {
  const { day, minutes } = getZonedWeekdayAndMinutes(now);
  /**
   * Output:
   * @returns object — isOpen (null si no hay horario), día actual y su franja
   */
  return {
    isOpen: hours.length > 0 ? isOpenAt(hours, day, minutes) : null,
    today: day,
    todayHours: getOpeningHoursForDay(hours, day),
  };
}

/**
 * Propósito: Chip "Abierto ahora / Cerrado ahora". No pinta nada si no hay horario.
 */
export function OpenNowBadge({ hours, t }: { hours: OpeningHoursDay[]; t: TranslateFn }) {
  const { isOpen, todayHours } = getOpenStatus(hours);
  if (isOpen === null) {
    /**
     * Output:
     * @returns null — Sin horario publicado
     */
    return null;
  }
  const detail =
    isOpen && todayHours?.closesAt
      ? t("venue.closesToday", { time: todayHours.closesAt })
      : !isOpen && todayHours && !todayHours.closed && todayHours.opensAt
        ? t("venue.opensToday", { time: todayHours.opensAt })
        : null;
  /**
   * Output:
   * @returns JSX.Element — Chip de estado
   */
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        isOpen ? "bg-lime/15 text-lime" : "bg-danger/15 text-danger",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", isOpen ? "bg-lime" : "bg-danger")}
      />
      {isOpen ? t("venue.openNow") : t("venue.closedNow")}
      {detail ? <span className="font-normal opacity-80">· {detail}</span> : null}
    </span>
  );
}

/**
 * Propósito: Tabla semanal de horario (lunes primero) con el día actual resaltado.
 */
export function VenueHoursTable({ hours, t }: { hours: OpeningHoursDay[]; t: TranslateFn }) {
  if (hours.length === 0) {
    /**
     * Output:
     * @returns JSX.Element — Aviso sin horario
     */
    return <p className="text-sm text-mist">{t("venue.hoursNotPublished")}</p>;
  }
  const { today } = getOpenStatus(hours);
  /**
   * Output:
   * @returns JSX.Element — Lista de días
   */
  return (
    <dl className="space-y-1.5 text-sm">
      {WEEK_DAYS_MONDAY_FIRST.map((day) => {
        const entry = getOpeningHoursForDay(hours, day);
        const isToday = day === today;
        return (
          <div
            key={day}
            className={cn(
              "flex items-center justify-between rounded-lg px-2 py-1",
              isToday && "bg-white/5",
            )}
          >
            <dt className={cn("text-mist", isToday && "font-semibold text-bone")}>
              {t(WEEK_DAY_LABEL_KEYS[day])}
              {isToday ? <span className="ml-2 text-xs text-lime">{t("venue.today")}</span> : null}
            </dt>
            <dd className={cn("tabular-nums", isToday ? "text-bone" : "text-mist")}>
              {!entry
                ? "—"
                : entry.closed
                  ? t("venue.closed")
                  : `${entry.opensAt} – ${entry.closesAt}`}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
