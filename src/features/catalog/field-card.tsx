import { getTranslator } from "@/core/i18n/get-locale";
import type { FieldCatalogItem } from "@/domain/field";
import { formatMoney } from "@/shared/lib/money";
import { SafeImage } from "@/shared/ui/safe-image";
import Link from "next/link";

/**
 * Propósito: Tarjeta de cancha; toda la tarjeta enlaza a los horarios de la cancha.
 */
export async function FieldCard({ field }: { field: FieldCatalogItem }) {
  const { t, intlLocale } = await getTranslator();
  const consultLabel = t("common.consult");

  /**
   * Output:
   * @returns JSX.Element — Card de cancha
   */
  return (
    <Link
      href={`/canchas/${field.id}`}
      className="group block overflow-hidden rounded-[28px] border border-white/8 bg-pitch transition duration-200 hover:-translate-y-0.5 hover:border-lime/30 hover:shadow-[0_16px_40px_-24px_rgba(214,242,106,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
    >
      <SafeImage
        src={field.imageFields}
        alt={t("catalog.courtName", { number: field.numberField })}
        fallbackLabel={field.numberField}
        className="h-48 w-full"
      />
      <div className="space-y-3 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lime">{field.establishmentName}</p>
          <h3 className="mt-1 font-display text-2xl text-bone">
            {t("catalog.courtName", { number: field.numberField })}
          </h3>
        </div>
        <p className="line-clamp-2 text-sm text-mist">
          {field.description || t("catalog.courtDefaultDescription")}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-bone">
            {formatMoney(field.basePricePerHour, intlLocale, consultLabel)}
            <span className="text-mist"> {t("catalog.perHour")}</span>
          </p>
          <span className="text-sm font-semibold text-lime group-hover:underline">
            {t("catalog.seeSlots")}
          </span>
        </div>
      </div>
    </Link>
  );
}
