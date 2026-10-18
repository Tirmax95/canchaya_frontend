import { getTranslator } from "@/core/i18n/get-locale";
import { PageHeader } from "@/shared/ui/page-header";
import Link from "next/link";

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

const LEGAL_LINKS = [
  { href: "/terminos", labelKey: "footer.terms" },
  { href: "/privacidad", labelKey: "footer.privacy" },
  { href: "/eliminar-cuenta", labelKey: "footer.deleteAccount" },
] as const;

/**
 * Propósito: Marco común de las páginas legales públicas. Mientras falten los datos del
 * responsable o la revisión legal (`isDraft`), muestra el aviso de borrador para que nadie tome
 * el texto como definitivo.
 */
export async function LegalDocument({
  kicker,
  title,
  intro,
  currentPath,
  sections = [],
  isDraft = true,
  children,
}: {
  kicker: string;
  title: string;
  intro: string;
  currentPath: string;
  sections?: LegalSection[];
  isDraft?: boolean;
  children?: React.ReactNode;
}) {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns JSX.Element — Documento con aviso de borrador, secciones y enlaces relacionados
   */
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader kicker={kicker} title={title} description={intro} />
      {isDraft ? (
        <aside
          role="note"
          className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-bone"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
            {t("legal.draftBadge")}
          </p>
          <p className="mt-1">{t("legal.draftNotice")}</p>
          <p className="mt-1 text-mist">{t("legal.lastUpdated")}</p>
        </aside>
      ) : (
        <p className="text-xs text-mist">{t("legal.lastUpdatedFinal")}</p>
      )}
      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="font-display text-2xl text-bone">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-7 text-mist">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      {children}
      <nav aria-label={t("legal.relatedTitle")} className="border-t border-white/8 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-mist">
          {t("legal.relatedTitle")}
        </p>
        <ul className="mt-3 flex flex-wrap gap-4 text-sm">
          {LEGAL_LINKS.filter((link) => link.href !== currentPath).map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-lime hover:text-bone">
                {t(link.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
