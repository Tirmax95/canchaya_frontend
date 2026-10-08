import { getSession } from "@/core/auth/session";
import { getPendingPayment, getPickupMatch } from "@/data/pickup.repository";
import { MatchActions } from "@/features/pickup/match-actions";
import { formatDateTime } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Partido" };

/**
 * Propósito: Detalle de un partido convocado con reserva/pago o gestión.
 */
export default async function PickupMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  let match;
  try {
    match = await getPickupMatch(Number(id));
  } catch {
    notFound();
  }
  let pendingPayment = null;
  if (session) {
    try {
      pendingPayment = await getPendingPayment(match.id);
    } catch {
      pendingPayment = null;
    }
  }

  /**
   * Output:
   * @returns JSX.Element — Detalle
   */
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader kicker={match.skillLevel} title={match.venueText} />
      <div className="rounded-[32px] border border-white/8 bg-pitch p-6 space-y-4">
        <p className="text-mist">{formatDateTime(match.startsAt)}</p>
        <p className="font-display text-4xl tabular-nums text-bone">
          {formatMoney(match.pricePerSlot)}
        </p>
        <p className="text-sm text-mist">
          {match.slotsLeft} libres · {match.slotsTaken}/{match.totalSlots} ·{" "}
          {match.status}
        </p>
        <MatchActions
          match={match}
          isOwner={session?.id === match.organizerId}
          isAuthenticated={Boolean(session)}
          pendingPayment={pendingPayment}
        />
      </div>
    </div>
  );
}
