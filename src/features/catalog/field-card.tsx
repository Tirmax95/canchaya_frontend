import { getTranslator } from "@/core/i18n/get-locale";
import type { FieldCatalogItem } from "@/domain/field";
import { formatMoney } from "@/shared/lib/money";
import { SafeImage } from "@/shared/ui/safe-image";
import Link from "next/link";

/**
 * Propósito: Tarjeta de cancha con CTA de reserva.
 */
export async function FieldCard({ field }: { field: FieldCatalogItem }) {
  const { t, intlLocale } = await getTranslator();
  const consultLabel = t("common.consult");

  /**
   * Output:
   * @returns JSX.Element — Card de cancha
   */
  return (
    <article className="overflow-hidden rounded-[28px] border border-white/8 bg-pitch">
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
          <Link href={`/canchas/${field.id}`} className="text-sm font-semibold text-lime hover:underline">
            {t("catalog.seeSlots")}
          </Link>
        </div>
      </div>
    </article>
  );
}
