import type { PickupMatch } from "@/domain/pickup";
import { formatMoney } from "@/shared/lib/money";
import { formatDateTime } from "@/shared/lib/datetime";
import { ButtonLink } from "@/shared/ui/button";

/**
 * Propósito: Tarjeta de partido convocado con cupos y urgencia.
 */
export function PickupMatchCard({ match }: { match: PickupMatch }) {
  /**
   * Output:
   * @returns JSX.Element — Card de feed
   */
  return (
    <article className="rounded-[28px] border border-white/8 bg-pitch p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-lime">
            {match.skillLevel} · {match.sport}
          </p>
          <h3 className="mt-2 font-display text-2xl text-bone">
            {match.venueText}
          </h3>
          <p className="mt-1 text-sm text-mist">{formatDateTime(match.startsAt)}</p>
        </div>
        {match.urgent ? (
          <span className="rounded-full bg-danger/20 px-3 py-1 text-xs text-danger">
            ¡Ya casi!
          </span>
        ) : (
          <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-mist">
            {match.status}
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-3xl tabular-nums text-bone">
            {formatMoney(match.pricePerSlot)}
          </p>
          <p className="text-xs text-mist">
            {match.slotsLeft} libres · {match.slotsTaken}/{match.totalSlots}
            {match.distanceMeters !== undefined
              ? ` · ${Math.round(match.distanceMeters / 100) / 10} km`
              : ""}
          </p>
        </div>
        <ButtonLink href={`/partidos/${match.id}`}>Ver cupo</ButtonLink>
      </div>
    </article>
  );
}
