import { requireAdminModule } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { listManagedEstablishments } from "@/data/establishment.repository";
import { EstablishmentForm } from "@/features/admin/establishment-form";
import { PageHeader } from "@/shared/ui/page-header";
import Link from "next/link";
import { notFound } from "next/navigation";

/**
 * Propósito: Edición de una sede existente.
 */
export default async function EditEstablishmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ t }] = await Promise.all([getTranslator(), requireAdminModule("establishments")]);
  const id = Number((await params).id);
  try {
    const establishments = await listManagedEstablishments();
    const establishment = establishments.find((item) => item.establishmentId === id);
    if (!establishment) {
      notFound();
    }
    return (
      <div className="space-y-8">
        <PageHeader
          kicker={t("admin.editVenue")}
          title={establishment.name}
          action={
            establishment.isActive ? (
              <Link
                href={`/establecimientos/${establishment.establishmentId}`}
                className="text-sm text-lime hover:underline"
              >
                {t("venue.viewPublic")}
              </Link>
            ) : undefined
          }
        />
        <EstablishmentForm establishment={establishment} />
      </div>
    );
  } catch {
    notFound();
  }
}
