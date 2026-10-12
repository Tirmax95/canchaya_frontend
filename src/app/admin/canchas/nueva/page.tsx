import { requireAdminModule } from "@/application/admin-access";
import { requireSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { listManagedEstablishments } from "@/data/establishment.repository";
import { FieldForm } from "@/features/admin/field-form";
import { PageHeader } from "@/shared/ui/page-header";

/**
 * Propósito: Alta de cancha con sedes precargadas. `?sede=` preselecciona la sede solo si
 * pertenece al tenant (se ignora cualquier id ajeno).
 */
export default async function NewFieldPage({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string }>;
}) {
  const [{ t }, , session, establishments, { sede }] = await Promise.all([
    getTranslator(),
    requireAdminModule("fields"),
    requireSession(),
    listManagedEstablishments(),
    searchParams,
  ]);
  const requestedEstablishmentId = Number(sede);
  const defaultEstablishmentId = establishments.some(
    (establishment) => establishment.establishmentId === requestedEstablishmentId,
  )
    ? requestedEstablishmentId
    : undefined;

  /**
   * Output:
   * @returns JSX.Element — Formulario de alta
   */
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader kicker={t("admin.courtsKicker")} title={t("admin.newCourt")} />
      <div className="rounded-[32px] border border-white/8 bg-pitch p-6">
        <FieldForm
          establishments={establishments}
          ownerId={session.id}
          defaultEstablishmentId={defaultEstablishmentId}
        />
      </div>
    </div>
  );
}
