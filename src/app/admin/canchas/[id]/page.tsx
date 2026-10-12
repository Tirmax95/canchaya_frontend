import { requireAdminModule } from "@/application/admin-access";
import { requireSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { listManagedEstablishments } from "@/data/establishment.repository";
import { listManagedFields } from "@/data/field.repository";
import { FieldForm } from "@/features/admin/field-form";
import { PageHeader } from "@/shared/ui/page-header";
import { notFound } from "next/navigation";

/**
 * Propósito: Edición de cancha. Carga sede + cancha en paralelo.
 */
export default async function EditFieldPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ t }] = await Promise.all([getTranslator(), requireAdminModule("fields")]);
  const fieldId = Number((await params).id);
  try {
    const [session, fields, establishments] = await Promise.all([
      requireSession(),
      listManagedFields(),
      listManagedEstablishments(),
    ]);
    const field = fields.find((item) => item.id === fieldId);
    if (!field) {
      notFound();
    }
    return (
      <div className="mx-auto max-w-xl space-y-8">
        <PageHeader kicker={t("admin.courtsKicker")} title={t("admin.editCourt")} />
        <div className="rounded-[32px] border border-white/8 bg-pitch p-6">
          <FieldForm field={field} establishments={establishments} ownerId={session.id} />
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
