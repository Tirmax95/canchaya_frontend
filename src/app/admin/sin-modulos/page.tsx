import { TENANT_BILLING_PATH, getAdminAccess } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { EmptyState } from "@/shared/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";

/**
 * Propósito: Metadata cuando el tenant no tiene módulos operables.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.sinModulosMeta") };
}

/**
 * Propósito: Destino cuando el tenant no tiene módulos operables: suspendido o sin módulos habilitados.
 */
export default async function NoModulesPage() {
  const [{ t }, access] = await Promise.all([getTranslator(), getAdminAccess()]);
  const isSuspended = access.suspendedTenants.length > 0;

  /**
   * Output:
   * @returns JSX.Element — Estado vacío explicativo
   */
  return (
    <EmptyState
      title={
        isSuspended ? t("admin.suspendedEmptyTitle") : t("admin.noModulesEmptyTitle")
      }
      description={
        isSuspended
          ? t("admin.suspendedEmptyDescription")
          : t("admin.noModulesEmptyDescription")
      }
      action={
        isSuspended && access.isTenantOwner ? (
          <Link href={TENANT_BILLING_PATH} className="text-lime hover:underline">
            {t("admin.seeInvoices")}
          </Link>
        ) : undefined
      }
    />
  );
}
