import { getSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { listMyMatches, listPickupFeed } from "@/data/pickup.repository";
import { BOGOTA, type PickupMatch } from "@/domain/pickup";
import { PickupMatchCard } from "@/features/pickup/match-card";
import { ButtonLink } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Título del feed de partidos convocados.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("pickup.matchesTitle") };
}

/**
 * Propósito: Feed de partidos convocados + los del usuario autenticado.
 */
export default async function PartidosPage() {
  const { t } = await getTranslator();
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
        kicker={t("pickup.matchesKicker")}
        title={t("pickup.matchesTitle")}
        description={t("pickup.matchesDescription")}
        action={<ButtonLink href="/partidos/nuevo">{t("pickup.convene")}</ButtonLink>}
      />
      {mine.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-bone">{t("pickup.yourMatches")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {mine.map((match) => (
              <PickupMatchCard key={`mine-${match.id}`} match={match} />
            ))}
          </div>
        </section>
      ) : null}
      {feed.length === 0 ? (
        <EmptyState
          title={t("pickup.emptyTitle")}
          description={t("pickup.emptyDescription")}
          action={<ButtonLink href="/partidos/nuevo">{t("pickup.conveneMatch")}</ButtonLink>}
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
