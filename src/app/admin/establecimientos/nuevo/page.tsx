import { requireAdminModule } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { EstablishmentForm } from "@/features/admin/establishment-form";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Metadata de alta de sede.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.newVenuePageTitle") };
}

/**
 * Propósito: Alta de sede. Requiere el módulo de sedes habilitado para el tenant.
 */
export default async function NewEstablishmentPage() {
  const [{ t }] = await Promise.all([getTranslator(), requireAdminModule("establishments")]);
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader kicker={t("admin.venuesKicker")} title={t("admin.newVenue")} />
      <div className="rounded-[32px] border border-white/8 bg-pitch p-6">
        <EstablishmentForm />
      </div>
    </div>
  );
}
