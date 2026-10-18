import { requireTenantOwnerAccess } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { getTeam } from "@/data/team.repository";
import { PanelSection } from "@/features/admin/platform/platform-ui";
import { TeamManager } from "@/features/admin/team/team-manager";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Metadata de gestión de equipo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.teamMeta") };
}

/**
 * Propósito: El dueño gestiona quién más administra cada uno de sus tenants.
 */
export default async function TeamPage() {
  const [{ t }, access] = await Promise.all([getTranslator(), requireTenantOwnerAccess("staff")]);
  const teams = await Promise.all(
    access.ownedTenants.map(async (tenant) => ({ tenant, team: await getTeam(tenant.organizationId) })),
  );

  /**
   * Output:
   * @returns JSX.Element — Equipo por tenant
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t("admin.teamKicker")}
        title={t("admin.teamTitle")}
        description={t("admin.teamDescription")}
      />
      {teams.map(({ tenant, team }) => (
        <PanelSection key={tenant.organizationId} title={tenant.organizationName}>
          <TeamManager
            organizationId={tenant.organizationId}
            members={team.members}
            invitations={team.invitations}
            isReadOnly={access.isReadOnly || !tenant.isOperable}
          />
        </PanelSection>
      ))}
    </div>
  );
}
