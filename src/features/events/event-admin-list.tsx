"use client";

import { EVENT_STATUS_KEYS } from "@/core/i18n/label-keys";
import { useI18n } from "@/core/i18n/provider";
import { EVENT_STATUSES, type EventStatus, type EventSummary } from "@/domain/events";
import { EventCard } from "@/features/events/event-card";
import { cn } from "@/shared/lib/cn";
import Link from "next/link";
import { useState } from "react";

/**
 * Propósito: Tarjetas de eventos del organizador con filtro por estado.
 */
export function EventAdminList({ events }: { events: EventSummary[] }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<EventStatus | "all">("all");
  const counts = new Map<EventStatus, number>();
  for (const event of events) {
    counts.set(event.status, (counts.get(event.status) ?? 0) + 1);
  }
  const visible = status === "all" ? events : events.filter((event) => event.status === status);

  /**
   * Output:
   * @returns JSX.Element — Filtros + tarjetas
   */
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", ...EVENT_STATUSES.filter((value) => counts.has(value))] as Array<EventStatus | "all">).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              status === value ? "border-lime/50 bg-lime/10 text-lime" : "border-white/10 text-mist hover:text-bone",
            )}
          >
            {value === "all" ? t("events.filterAll") : t(EVENT_STATUS_KEYS[value])}
            <span className="ml-1 opacity-70">{value === "all" ? events.length : counts.get(value)}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((event) => (
          <EventCard
            key={event.eventId}
            event={event}
            href={`/admin/eventos/${event.eventId}`}
            footer={
              <Link href={`/admin/eventos/${event.eventId}`} className="text-sm font-semibold text-lime hover:underline">
                {t("events.adminManage")}
              </Link>
            }
          />
        ))}
      </div>
    </div>
  );
}
