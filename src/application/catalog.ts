import { shouldSeeOnlyOwnedVenues } from "@/core/auth/roles";
import { getSession } from "@/core/auth/session";
import { AppError } from "@/core/errors/app-error";
import {
  listEstablishments,
  listManagedEstablishments,
} from "@/data/establishment.repository";
import { listFields, listManagedFields } from "@/data/field.repository";
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
 * Propósito: Catálogo de sedes que el actor puede administrar.
 */
export async function getManagedEstablishmentCatalog(): Promise<
  EstablishmentCatalogItem[]
> {
  const [establishments, fields] = await Promise.all([
    listManagedEstablishments(),
    listManagedFields(),
  ]);
  const fieldsByEstablishment = new Map<number, typeof fields>();
  for (const field of fields) {
    const current = fieldsByEstablishment.get(field.establishmentId) ?? [];
    current.push(field);
    fieldsByEstablishment.set(field.establishmentId, current);
  }
  /**
   * Output:
   * @returns EstablishmentCatalogItem[] — Sedes del tenant
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
 * Propósito: Canchas administrables con nombre de sede. Un par de fetches.
 */
export async function getManagedFieldCatalog(): Promise<FieldCatalogItem[]> {
  const [fields, establishments] = await Promise.all([
    listManagedFields(),
    listManagedEstablishments(),
  ]);
  const establishmentsById = new Map(
    establishments.map((establishment) => [
      establishment.establishmentId,
      establishment,
    ]),
  );
  /**
   * Output:
   * @returns FieldCatalogItem[] — Canchas del tenant
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
 * Propósito: Catálogo de sedes visible para el usuario actual.
 * Dueño/manager solo ve su organización; jugador, admin o anónimo ven el marketplace.
 */
export async function getVisibleEstablishmentCatalog(): Promise<
  EstablishmentCatalogItem[]
> {
  const session = await getSession();
  if (shouldSeeOnlyOwnedVenues(session)) {
    /**
     * Output:
     * @returns EstablishmentCatalogItem[] — Sedes del tenant autenticado
     */
    return getManagedEstablishmentCatalog();
  }
  /**
   * Output:
   * @returns EstablishmentCatalogItem[] — Marketplace público
   */
  return getEstablishmentCatalog();
}

/**
 * Propósito: Catálogo de canchas visible para el usuario actual. Misma regla de tenant.
 */
export async function getVisibleFieldCatalog(): Promise<FieldCatalogItem[]> {
  const session = await getSession();
  if (shouldSeeOnlyOwnedVenues(session)) {
    /**
     * Output:
     * @returns FieldCatalogItem[] — Canchas del tenant autenticado
     */
    return getManagedFieldCatalog();
  }
  /**
   * Output:
   * @returns FieldCatalogItem[] — Marketplace público
   */
  return getFieldCatalog();
}

/**
 * Propósito: Impide que un dueño abra por URL una sede de otro tenant.
 */
export async function assertViewerCanSeeEstablishment(
  establishmentId: number,
): Promise<void> {
  const session = await getSession();
  if (!shouldSeeOnlyOwnedVenues(session)) {
    /**
     * Output:
     * Side effects — Marketplace público, no restringe
     */
    return;
  }
  const owned = await listManagedEstablishments();
  if (
    !owned.some((establishment) => establishment.establishmentId === establishmentId)
  ) {
    /**
     * Output:
     * @throws AppError — 404 para no filtrar existencia a otro tenant
     */
    throw new AppError("NOT_FOUND", "Establecimiento no encontrado", 404);
  }
}

/**
 * Propósito: Impide que un dueño abra por URL una cancha de otro tenant.
 */
export async function assertViewerCanSeeField(fieldId: number): Promise<void> {
  const session = await getSession();
  if (!shouldSeeOnlyOwnedVenues(session)) {
    /**
     * Output:
     * Side effects — Marketplace público, no restringe
     */
    return;
  }
  const owned = await listManagedFields();
  if (!owned.some((field) => field.id === fieldId)) {
    /**
     * Output:
     * @throws AppError — 404 para no filtrar existencia a otro tenant
     */
    throw new AppError("NOT_FOUND", "Cancha no encontrada", 404);
  }
}

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
