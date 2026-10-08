import { requestBackend } from "@/core/http/backend-client";
import { toEstablishment } from "@/data/mappers";
import type { Establishment } from "@/domain/establishment";
import type { EstablishmentInput } from "@/domain/schemas";

interface EstablishmentEnvelope {
  establishments?: unknown;
  establishment?: unknown;
}

/**
 * Propósito: Lista todas las sedes en una sola llamada.
 */
export async function listEstablishments(): Promise<Establishment[]> {
  const payload = await requestBackend<EstablishmentEnvelope>({
    path: "/establishment/get",
  });
  const items = Array.isArray(payload.establishments)
    ? payload.establishments
    : [];

  /**
   * Output:
   * @returns Establishment[] — Sedes normalizadas
   */
  return items.map((item) => toEstablishment(item as object));
}

/**
 * Propósito: Obtiene una sede por id.
 */
export async function getEstablishmentById(
  establishmentId: number,
): Promise<Establishment> {
  const payload = await requestBackend<EstablishmentEnvelope>({
    path: `/establishment/get/${establishmentId}`,
  });

  /**
   * Output:
   * @returns Establishment — Sede encontrada
   */
  return toEstablishment((payload.establishment ?? {}) as object);
}

/**
 * Propósito: Crea una sede con el contrato snake_case del backend.
 */
export async function createEstablishment(
  input: EstablishmentInput,
): Promise<Establishment> {
  const payload = await requestBackend<EstablishmentEnvelope>({
    path: "/establishment/create",
    method: "POST",
    body: input,
  });

  /**
   * Output:
   * @returns Establishment — Sede creada
   */
  return toEstablishment((payload.establishment ?? {}) as object);
}

/**
 * Propósito: Actualiza una sede existente.
 */
export async function updateEstablishment(
  establishmentId: number,
  input: EstablishmentInput,
): Promise<Establishment> {
  const payload = await requestBackend<EstablishmentEnvelope>({
    path: `/establishment/update/${establishmentId}`,
    method: "PUT",
    body: input,
  });

  /**
   * Output:
   * @returns Establishment — Sede actualizada
   */
  return toEstablishment((payload.establishment ?? {}) as object);
}

/**
 * Propósito: Elimina una sede.
 */
export async function deleteEstablishment(
  establishmentId: number,
): Promise<void> {
  await requestBackend({
    path: `/establishment/delete/${establishmentId}`,
    method: "DELETE",
  });
  /**
   * Output:
   * Side effects — Borra la sede en el backend
   */
}
