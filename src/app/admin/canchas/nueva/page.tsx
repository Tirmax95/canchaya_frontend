import { requireSession } from "@/core/auth/session";
import { listEstablishments } from "@/data/establishment.repository";
import { FieldForm } from "@/features/admin/field-form";
import { PageHeader } from "@/shared/ui/page-header";

/**
 * Propósito: Alta de cancha con sedes precargadas.
 */
export default async function NewFieldPage() {
  const [session, establishments] = await Promise.all([
    requireSession(),
    listEstablishments(),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader kicker="Canchas" title="Nueva cancha" />
      <div className="rounded-[32px] border border-white/8 bg-pitch p-6">
        <FieldForm establishments={establishments} ownerId={session.id} />
      </div>
    </div>
  );
}
