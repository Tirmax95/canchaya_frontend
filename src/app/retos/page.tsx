import { requireSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { listMyRetos, listMyTeams } from "@/data/pickup.repository";
import { RetoPanel } from "@/features/pickup/reto-panel";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Título del tablero de retos.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("pickup.challengesTitle") };
}

/**
 * Propósito: Retos entre equipos del usuario.
 */
export default async function RetosPage() {
  const { t } = await getTranslator();
  const session = await requireSession();
  const [retos, teams] = await Promise.all([listMyRetos(), listMyTeams()]);
  const isCaptain = teams.some((team) => team.captainId === session.id);

  /**
   * Output:
   * @returns JSX.Element — Tablero de retos
   */
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker={t("pickup.challengesKicker")}
        title={t("pickup.challengesTitle")}
        description={t("pickup.challengesDescription")}
      />
      <RetoPanel retos={retos} isCaptain={isCaptain} />
    </div>
  );
}
