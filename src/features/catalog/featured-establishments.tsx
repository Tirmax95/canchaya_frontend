import { getVisibleEstablishmentCatalog } from "@/application/catalog";
import { getTranslator } from "@/core/i18n/get-locale";
import { EstablishmentCard } from "@/features/catalog/establishment-card";

/**
 * Propósito: Isla de catálogo en home. Aísla el fetch para no bloquear el hero.
 */
export async function FeaturedEstablishments() {
  const { t } = await getTranslator();

  try {
    const featured = (await getVisibleEstablishmentCatalog()).slice(0, 3);
    if (featured.length === 0) {
      /**
       * Output:
       * @returns JSX.Element — Empty copy si el API responde vacío
       */
      return <p className="text-sm text-mist">{t("home.emptyFeatured")}</p>;
    }

    /**
     * Output:
     * @returns JSX.Element — Tres sedes destacadas
     */
    return (
      <div className="grid gap-5 md:grid-cols-3">
        {featured.map((establishment) => (
          <EstablishmentCard key={establishment.establishmentId} establishment={establishment} />
        ))}
      </div>
    );
  } catch {
    /**
     * Output:
     * @returns JSX.Element — Fallback si el backend no responde
     */
    return (
      <p className="rounded-2xl border border-white/10 px-4 py-6 text-sm text-mist">
        {t("home.catalogOffline")}
      </p>
    );
  }
}
