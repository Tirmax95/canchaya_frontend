import { getTranslator } from "@/core/i18n/get-locale";
import type { EstablishmentCatalogItem } from "@/domain/establishment";
import { formatMoney } from "@/shared/lib/money";
import { SafeImage } from "@/shared/ui/safe-image";
import Link from "next/link";

/**
 * Propósito: Tarjeta de sede con precio desde y conteo de canchas.
 */
export async function EstablishmentCard({
  establishment,
}: {
  establishment: EstablishmentCatalogItem;
}) {
  const { t, intlLocale } = await getTranslator();
  const consultLabel = t("common.consult");
  const priceLabel = formatMoney(establishment.minPricePerHour, intlLocale, consultLabel);
  const courtLabel =
    establishment.fieldCount === 1 ? t("catalog.oneCourt") : t("catalog.manyCourts");

  /**
   * Output:
   * @returns JSX.Element — Card navegable
   */
  return (
    <Link
      href={`/establecimientos/${establishment.establishmentId}`}
      className="group overflow-hidden rounded-[28px] border border-white/8 bg-pitch transition hover:-translate-y-0.5 hover:border-lime/30"
    >
      <SafeImage
        src={establishment.imageEstablishment}
        alt={establishment.name}
        fallbackLabel={establishment.name.slice(0, 2).toUpperCase()}
        className="h-52 w-full"
      />
      <div className="space-y-2 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-lime">
          {establishment.organizationName || t("common.unknownVenue")}
        </p>
        <h3 className="font-display text-2xl text-bone group-hover:text-lime">{establishment.name}</h3>
        <p className="text-sm text-mist">
          {establishment.address || t("catalog.addressPending")}
        </p>
        <div className="flex items-center justify-between pt-2 text-sm">
          <span className="text-mist">
            {establishment.fieldCount} {courtLabel}
          </span>
          <span className="text-bone">{t("catalog.fromPrice", { price: priceLabel })}</span>
        </div>
      </div>
    </Link>
  );
}
