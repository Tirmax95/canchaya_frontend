import { requireSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { listMyTeams, listTeamInvites } from "@/data/pickup.repository";
import { TeamPanel } from "@/features/pickup/team-panel";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Título del panel de equipos.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("pickup.teamsTitle") };
}

/**
 * Propósito: Equipos e invitaciones del jugador autenticado.
 */
export default async function EquiposPage() {
  const { t } = await getTranslator();
  const session = await requireSession();
  const [teams, invites] = await Promise.all([
    listMyTeams(),
    listTeamInvites(),
  ]);

  /**
   * Output:
   * @returns JSX.Element — Plantillas
   */
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker={t("pickup.teamsKicker")}
        title={t("pickup.teamsTitle")}
        description={t("pickup.teamsDescription")}
      />
      <TeamPanel teams={teams} invites={invites} userId={session.id} />
    </div>
  );
}
