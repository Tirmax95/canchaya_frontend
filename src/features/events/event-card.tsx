"use client";

import { EVENT_FORMAT_KEYS, EVENT_SPORT_KEYS } from "@/core/i18n/label-keys";
import { useI18n } from "@/core/i18n/provider";
import { getFreeSeats, type EventSummary } from "@/domain/events";
import { EventStatusBadge } from "@/features/events/event-badges";
import { formatEntryFee, formatEventDates } from "@/features/events/event-format";
import { cn } from "@/shared/lib/cn";
import { SafeImage } from "@/shared/ui/safe-image";
import Link from "next/link";

/**
 * Propósito: Tarjeta de evento con portada, estado, fechas, sede, formato, cupos y valor.
 * La usan el catálogo público y el panel del organizador.
 */
export function EventCard({
  event,
  href,
  footer,
}: {
  event: EventSummary;
  href: string;
  footer?: React.ReactNode;
}) {
  const { t, intlLocale } = useI18n();
  const freeSeats = getFreeSeats(event);
  const fee = formatEntryFee(event, intlLocale);
  const seatsPercent = Math.min(100, Math.round((event.seatsTaken / Math.max(event.maxTeams, 1)) * 100));

  /**
   * Output:
   * @returns JSX.Element — Card navegable
   */
  return (
    <article className="group flex flex-col overflow-hidden rounded-[28px] border border-white/8 bg-pitch transition hover:border-lime/30">
      <Link href={href} className="relative block">
        <SafeImage
          src={event.coverImage}
          alt={event.name}
          fallbackLabel={event.name.slice(0, 2).toUpperCase()}
          className="h-40 w-full"
        />
        <div className="absolute left-3 top-3">
          <EventStatusBadge status={event.status} />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lime">
            {t(EVENT_SPORT_KEYS[event.sport])} · {t(EVENT_FORMAT_KEYS[event.format])}
          </p>
          <h3 className="mt-1 font-display text-2xl text-bone group-hover:text-lime">
            <Link href={href}>{event.name}</Link>
          </h3>
          <p className="mt-1 text-sm text-mist">
            {formatEventDates(event, intlLocale)} ·{" "}
            {[event.establishmentName, event.establishmentCity].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between text-xs text-mist">
            <span>{t("events.seats", { taken: event.seatsTaken, max: event.maxTeams })}</span>
            <span className={cn(freeSeats === 0 && "text-clay")}>
              {freeSeats === 0
                ? event.waitlistedTeams > 0
                  ? t("events.waitlist", { count: event.waitlistedTeams })
                  : t("events.full")
                : t("events.seatsLeft", { count: freeSeats })}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-lime" style={{ width: `${seatsPercent}%` }} />
          </div>
          <div className="flex items-center justify-between pt-1 text-sm">
            <span className="font-semibold text-bone">
              {fee ? t("events.feePerTeam", { price: fee }) : t("events.free")}
            </span>
            {footer}
          </div>
        </div>
      </div>
    </article>
  );
}
