import { readLegalEntity } from "@/core/config/legal";
import { getTranslator } from "@/core/i18n/get-locale";
import { LegalDocument } from "@/features/legal/legal-document";
import type { Metadata } from "next";

/**
 * Propósito: Título de los términos según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("legal.terms.title") };
}

/**
 * Propósito: Términos y condiciones públicos (la app los enlaza desde el registro y el perfil).
 * Borrador pendiente de revisión legal.
 */
export default async function TermsPage() {
  const { t } = await getTranslator();
  const entity = readLegalEntity();
  const contact = entity.contactEmail ?? t("legal.pendingContact");
  const s1Body =
    entity.name && entity.taxId && entity.address && entity.contactEmail
      ? t("legal.terms.s1BodyFinal", {
          name: entity.name,
          taxId: entity.taxId,
          address: entity.address,
          contact,
        })
      : t("legal.terms.s1Body", { contact });
  /**
   * Output:
   * @returns JSX.Element — Términos en borrador
   */
  return (
    <LegalDocument
      isDraft={!entity.isFinal}
      kicker={t("legal.terms.kicker")}
      title={t("legal.terms.title")}
      intro={t("legal.terms.intro")}
      currentPath="/terminos"
      sections={[
        { title: t("legal.terms.s1Title"), paragraphs: [s1Body] },
        {
          title: t("legal.terms.s2Title"),
          paragraphs: [t("legal.terms.s2Body1"), t("legal.terms.s2Body2")],
        },
        {
          title: t("legal.terms.s3Title"),
          paragraphs: [t("legal.terms.s3Body1"), t("legal.terms.s3Body2")],
        },
        { title: t("legal.terms.s4Title"), paragraphs: [t("legal.terms.s4Body")] },
        { title: t("legal.terms.s5Title"), paragraphs: [t("legal.terms.s5Body")] },
        { title: t("legal.terms.s6Title"), paragraphs: [t("legal.terms.s6Body")] },
        { title: t("legal.terms.s7Title"), paragraphs: [t("legal.terms.s7Body")] },
        { title: t("legal.terms.s8Title"), paragraphs: [t("legal.terms.s8Body")] },
        { title: t("legal.terms.s9Title"), paragraphs: [t("legal.terms.s9Body")] },
        { title: t("legal.terms.s10Title"), paragraphs: [t("legal.terms.s10Body")] },
      ]}
    />
  );
}
