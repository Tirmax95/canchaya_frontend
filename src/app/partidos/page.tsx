import { getSession } from "@/core/auth/session";
import { listMyMatches, listPickupFeed } from "@/data/pickup.repository";
import { BOGOTA, type PickupMatch } from "@/domain/pickup";
import { PickupMatchCard } from "@/features/pickup/match-card";
import { ButtonLink } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Partidos cerca" };

/**
 * Propósito: Feed de partidos convocados + los del usuario autenticado.
 */
export default async function PartidosPage() {
  const session = await getSession();
  let feed: PickupMatch[] = [];
  let mine: PickupMatch[] = [];
  try {
    [feed, mine] = await Promise.all([
      listPickupFeed(BOGOTA.lat, BOGOTA.lng),
      session ? listMyMatches() : Promise.resolve([]),
    ]);
  } catch {
    feed = [];
  }

  /**
   * Output:
   * @returns JSX.Element — Feed de convocatorias
   */
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6">
      <PageHeader
        kicker="Convoca"
        title="Partidos cerca"
        description="Jugadores publican cupos. Reserva, paga y llega a la cancha."
        action={<ButtonLink href="/partidos/nuevo">Convocar</ButtonLink>}
      />
      {mine.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-bone">Tus partidos</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {mine.map((match) => (
              <PickupMatchCard key={`mine-${match.id}`} match={match} />
            ))}
          </div>
        </section>
      ) : null}
      {feed.length === 0 ? (
        <EmptyState
          title="No hay partidos cerca"
          description="Sé el primero en convocar uno esta semana."
          action={<ButtonLink href="/partidos/nuevo">Convocar un partido</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {feed.map((match) => (
            <PickupMatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
