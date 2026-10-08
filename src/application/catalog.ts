import { listEstablishments } from "@/data/establishment.repository";
import { listFields } from "@/data/field.repository";
import type { EstablishmentCatalogItem } from "@/domain/establishment";
import type { FieldCatalogItem } from "@/domain/field";

/**
 * Propósito: Arma el catálogo de sedes con conteo y precio mínimo en O(n).
 * Precarga canchas en paralelo para evitar N+1 por establecimiento.
 */
export async function getEstablishmentCatalog(): Promise<
  EstablishmentCatalogItem[]
> {
  const [establishments, fields] = await Promise.all([
    listEstablishments(),
    listFields(),
  ]);

  const fieldsByEstablishment = new Map<number, typeof fields>();
  for (const field of fields) {
    const current = fieldsByEstablishment.get(field.establishmentId) ?? [];
    current.push(field);
    fieldsByEstablishment.set(field.establishmentId, current);
  }

  /**
   * Output:
   * @returns EstablishmentCatalogItem[] — Sedes con métricas de canchas
   */
  return establishments.map((establishment) => {
    const venueFields =
      fieldsByEstablishment.get(establishment.establishmentId) ?? [];
    const prices = venueFields.map((field) => field.basePricePerHour);
    return {
      ...establishment,
      fieldCount: venueFields.length,
      minPricePerHour: prices.length ? Math.min(...prices) : null,
    };
  });
}

/**
 * Propósito: Une canchas con su sede en un solo par de fetches.
 */
export async function getFieldCatalog(): Promise<FieldCatalogItem[]> {
  const [fields, establishments] = await Promise.all([
    listFields(),
    listEstablishments(),
  ]);
  const establishmentsById = new Map(
    establishments.map((establishment) => [
      establishment.establishmentId,
      establishment,
    ]),
  );

  /**
   * Output:
   * @returns FieldCatalogItem[] — Canchas enriquecidas con nombre de sede
   */
  return fields.map((field) => {
    const establishment = establishmentsById.get(field.establishmentId);
    return {
      ...field,
      establishmentName: establishment?.name ?? "Sede",
      establishmentAddress: establishment?.address ?? "",
    };
  });
}

/**
 * Propósito: Filtra el catálogo de canchas de una sede sin refetch.
 */
export function filterFieldsByEstablishment(
  fields: FieldCatalogItem[],
  establishmentId: number,
): FieldCatalogItem[] {
  /**
   * Output:
   * @returns FieldCatalogItem[] — Canchas de esa sede
   */
  return fields.filter((field) => field.establishmentId === establishmentId);
}
