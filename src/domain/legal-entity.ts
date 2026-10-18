/**
 * Propósito: Datos del responsable que aparecen en las páginas legales (términos, privacidad,
 * eliminar cuenta). Llegan por configuración; mientras falten, las páginas muestran el aviso de
 * borrador y un marcador en lugar del correo.
 */
export interface LegalEntity {
  /** Razón social del responsable. */
  name: string | null;
  /** NIT u otro identificador tributario. */
  taxId: string | null;
  address: string | null;
  contactEmail: string | null;
  /** True solo con todos los datos y la revisión legal confirmada. */
  isFinal: boolean;
}

export interface LegalEntityInput {
  name?: string;
  taxId?: string;
  address?: string;
  contactEmail?: string;
  reviewed?: string;
}

const EMAIL_PATTERN = /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i;
const MAX_FIELD_LENGTH = 200;

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= MAX_FIELD_LENGTH ? trimmed : null;
}

/**
 * Propósito: Valida y normaliza los datos legales. Un correo mal escrito se descarta (mejor el
 * marcador que publicar un contacto que no existe).
 */
export function parseLegalEntity(input: LegalEntityInput): LegalEntity {
  const contact = clean(input.contactEmail);
  const entity = {
    name: clean(input.name),
    taxId: clean(input.taxId),
    address: clean(input.address),
    contactEmail: contact && EMAIL_PATTERN.test(contact) ? contact.toLowerCase() : null,
  };
  const isComplete = Object.values(entity).every((value) => value !== null);
  /**
   * Output:
   * @returns LegalEntity — Datos válidos o null por campo, y si el documento es definitivo
   */
  return { ...entity, isFinal: isComplete && input.reviewed?.trim() === "true" };
}
