import { requestBackend } from "@/core/http/backend-client";
import { toField } from "@/data/mappers";
import type { Field } from "@/domain/field";
import type { FieldInput } from "@/domain/schemas";

interface FieldEnvelope {
  fields?: unknown;
  field?: unknown;
}

/**
 * Propósito: Lista todas las canchas en una sola llamada.
 */
export async function listFields(): Promise<Field[]> {
  const payload = await requestBackend<FieldEnvelope>({
    path: "/field/get",
  });
  const items = Array.isArray(payload.fields) ? payload.fields : [];

  /**
   * Output:
   * @returns Field[] — Canchas normalizadas
   */
  return items.map((item) => toField(item as object));
}

/**
 * Propósito: Obtiene una cancha por id.
 */
export async function getFieldById(fieldId: number): Promise<Field> {
  const payload = await requestBackend<FieldEnvelope>({
    path: `/field/get/${fieldId}`,
  });

  /**
   * Output:
   * @returns Field — Cancha encontrada
   */
  return toField((payload.field ?? {}) as object);
}

/**
 * Propósito: Crea una cancha con el contrato del backend.
 */
export async function createField(input: FieldInput): Promise<Field> {
  const payload = await requestBackend<FieldEnvelope>({
    path: "/field/create",
    method: "POST",
    body: input,
  });

  /**
   * Output:
   * @returns Field — Cancha creada
   */
  return toField((payload.field ?? {}) as object);
}

/**
 * Propósito: Actualiza una cancha existente.
 */
export async function updateField(
  fieldId: number,
  input: FieldInput,
): Promise<Field> {
  const payload = await requestBackend<FieldEnvelope>({
    path: `/field/update/${fieldId}`,
    method: "PUT",
    body: input,
  });

  /**
   * Output:
   * @returns Field — Cancha actualizada
   */
  return toField((payload.field ?? {}) as object);
}

/**
 * Propósito: Elimina una cancha.
 */
export async function deleteField(fieldId: number): Promise<void> {
  await requestBackend({
    path: `/field/delete/${fieldId}`,
    method: "DELETE",
  });
  /**
   * Output:
   * Side effects — Borra la cancha en el backend
   */
}
