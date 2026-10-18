import { readLegalEntity } from "@/core/config/legal";
import { getTranslator } from "@/core/i18n/get-locale";
import { LegalDocument } from "@/features/legal/legal-document";
import type { Metadata } from "next";

/**
 * Propósito: Título de la política de privacidad según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("legal.privacy.title") };
}

/**
 * Propósito: Política de privacidad pública. Describe los datos que la plataforma recoge de
 * verdad y cómo borrar la cuenta. Borrador pendiente de revisión legal.
 */
export default async function PrivacyPage() {
  const { t } = await getTranslator();
  const entity = readLegalEntity();
  const contact = entity.contactEmail ?? t("legal.pendingContact");
  const s1Body =
    entity.name && entity.taxId && entity.address && entity.contactEmail
      ? t("legal.privacy.s1BodyFinal", {
          name: entity.name,
          taxId: entity.taxId,
          address: entity.address,
          contact,
        })
      : t("legal.privacy.s1Body", { contact });
  /**
   * Output:
   * @returns JSX.Element — Política de privacidad en borrador
   */
  return (
    <LegalDocument
      isDraft={!entity.isFinal}
      kicker={t("legal.privacy.kicker")}
      title={t("legal.privacy.title")}
      intro={t("legal.privacy.intro")}
      currentPath="/privacidad"
      sections={[
        { title: t("legal.privacy.s1Title"), paragraphs: [s1Body] },
        {
          title: t("legal.privacy.s2Title"),
          paragraphs: [
            t("legal.privacy.s2Account"),
            t("legal.privacy.s2Bookings"),
            t("legal.privacy.s2Teams"),
            t("legal.privacy.s2Messages"),
            t("legal.privacy.s2Push"),
            t("legal.privacy.s2Security"),
            t("legal.privacy.s2Errors"),
            t("legal.privacy.s2NoMore"),
          ],
        },
        { title: t("legal.privacy.s3Title"), paragraphs: [t("legal.privacy.s3Body")] },
        {
          title: t("legal.privacy.s4Title"),
          paragraphs: [t("legal.privacy.s4Body1"), t("legal.privacy.s4Body2")],
        },
        { title: t("legal.privacy.s5Title"), paragraphs: [t("legal.privacy.s5Body")] },
        {
          title: t("legal.privacy.s6Title"),
          paragraphs: [
            t("legal.privacy.s6Body1"),
            t("legal.privacy.s6Body2"),
            t("legal.privacy.s6Body3"),
            t("legal.privacy.s6Body4"),
          ],
        },
        { title: t("legal.privacy.s7Title"), paragraphs: [t("legal.privacy.s7Body")] },
        { title: t("legal.privacy.s8Title"), paragraphs: [t("legal.privacy.s8Body")] },
        { title: t("legal.privacy.s9Title"), paragraphs: [t("legal.privacy.s9Body")] },
      ]}
    />
  );
}
