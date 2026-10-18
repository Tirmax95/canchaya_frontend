import { requireTenantOwnerAccess } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { listManagedEvents } from "@/data/event.repository";
import { listManagedNews } from "@/data/news.repository";
import { NewsManager, type NewsEventOption } from "@/features/admin/news/news-manager";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Metadata de noticias de la sede.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.newsMeta") };
}

/**
 * Propósito: El dueño publica, programa, edita y borra las noticias de sus tenants.
 * Los eventos solo sirven para ligar la noticia; si el módulo de eventos está apagado
 * la lista queda vacía en vez de romper la página.
 */
export default async function NewsAdminPage() {
  const [{ t }, access] = await Promise.all([getTranslator(), requireTenantOwnerAccess("news")]);
  const [posts, events] = await Promise.all([
    listManagedNews(),
    listManagedEvents().catch(() => []),
  ]);
  const ownedOrganizationIds = new Set(access.ownedTenants.map((tenant) => tenant.organizationId));
  const eventOptions: NewsEventOption[] = events
    .filter((event) => ownedOrganizationIds.has(event.organizationId) && event.status !== "draft")
    .map((event) => ({ eventId: event.eventId, organizationId: event.organizationId, name: event.name }));

  /**
   * Output:
   * @returns JSX.Element — Formulario y listado de noticias
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t("admin.newsKicker")}
        title={t("admin.newsTitle")}
        description={t("admin.newsDescription")}
      />
      <NewsManager
        tenants={access.ownedTenants.filter((tenant) => tenant.isOperable)}
        posts={posts}
        events={eventOptions}
        isReadOnly={access.isReadOnly}
      />
    </div>
  );
}
