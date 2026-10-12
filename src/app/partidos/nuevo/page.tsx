import { requireSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { CreateMatchForm } from "@/features/pickup/create-match-form";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Título del formulario de convocatoria.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("pickup.newMatchPageTitle") };
}

/**
 * Propósito: Alta de un partido convocado. Exige sesión.
 */
export default async function NewPickupMatchPage() {
  const { t } = await getTranslator();
  await requireSession();
  /**
   * Output:
   * @returns JSX.Element — Formulario
   */
  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker={t("pickup.newKicker")}
        title={t("pickup.newTitle")}
        description={t("pickup.newDescription")}
      />
      <div className="rounded-[32px] border border-white/8 bg-pitch p-6">
        <CreateMatchForm />
      </div>
    </div>
  );
}
