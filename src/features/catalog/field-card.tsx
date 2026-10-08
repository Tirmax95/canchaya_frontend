import type { FieldCatalogItem } from "@/domain/field";
import { formatMoney } from "@/shared/lib/money";
import { SafeImage } from "@/shared/ui/safe-image";
import Link from "next/link";

/**
 * Propósito: Tarjeta de cancha con CTA de reserva.
 */
export function FieldCard({ field }: { field: FieldCatalogItem }) {
  /**
   * Output:
   * @returns JSX.Element — Card de cancha
   */
  return (
    <article className="overflow-hidden rounded-[28px] border border-white/8 bg-pitch">
      <SafeImage
        src={field.imageFields}
        alt={`Cancha ${field.numberField}`}
        fallbackLabel={field.numberField}
        className="h-48 w-full"
      />
      <div className="space-y-3 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lime">
            {field.establishmentName}
          </p>
          <h3 className="mt-1 font-display text-2xl text-bone">
            Cancha {field.numberField}
          </h3>
        </div>
        <p className="line-clamp-2 text-sm text-mist">
          {field.description || "Cancha lista para el próximo partido."}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-bone">
            {formatMoney(field.basePricePerHour)}
            <span className="text-mist"> / hora</span>
          </p>
          <Link
            href={`/canchas/${field.id}`}
            className="text-sm font-semibold text-lime hover:underline"
          >
            Ver horarios
          </Link>
        </div>
      </div>
    </article>
  );
}
