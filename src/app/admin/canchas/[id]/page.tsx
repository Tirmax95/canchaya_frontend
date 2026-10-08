import { requireSession } from "@/core/auth/session";
import { listEstablishments } from "@/data/establishment.repository";
import { getFieldById } from "@/data/field.repository";
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
  const fieldId = Number((await params).id);
  try {
    const [session, field, establishments] = await Promise.all([
      requireSession(),
      getFieldById(fieldId),
      listEstablishments(),
    ]);
    return (
      <div className="mx-auto max-w-xl space-y-8">
        <PageHeader kicker="Canchas" title="Editar cancha" />
        <div className="rounded-[32px] border border-white/8 bg-pitch p-6">
          <FieldForm
            field={field}
            establishments={establishments}
            ownerId={session.id}
          />
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
