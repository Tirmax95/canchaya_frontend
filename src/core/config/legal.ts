import { parseLegalEntity, type LegalEntity } from "@/domain/legal-entity";

/**
 * Propósito: Lee del entorno los datos del responsable para las páginas legales.
 */
export function readLegalEntity(): LegalEntity {
  /**
   * Output:
   * @returns LegalEntity — Ver `parseLegalEntity`
   */
  return parseLegalEntity({
    name: process.env.LEGAL_ENTITY_NAME,
    taxId: process.env.LEGAL_ENTITY_TAX_ID,
    address: process.env.LEGAL_ENTITY_ADDRESS,
    contactEmail: process.env.LEGAL_CONTACT_EMAIL,
    reviewed: process.env.LEGAL_DOCUMENTS_REVIEWED,
  });
}
