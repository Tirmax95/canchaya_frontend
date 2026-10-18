import { getSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { getTwoFactorStatus } from "@/data/auth.repository";
import { DeleteAccountForm } from "@/features/legal/delete-account-form";
import { LegalDocument } from "@/features/legal/legal-document";
import { Alert } from "@/shared/ui/alert";
import { buttonClassName } from "@/shared/ui/button-styles";
import type { Metadata } from "next";
import Link from "next/link";

/**
 * Propósito: Título de la página de borrado según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("legal.deletion.title") };
}

/**
 * Propósito: Si el 2FA está activo el código es obligatorio. Si la consulta falla (sesión
 * revocada, backend caído), devuelve null y el formulario lo muestra como opcional.
 */
async function readTwoFactorEnabled(): Promise<boolean | null> {
  try {
    /**
     * Output:
     * @returns boolean — Estado del 2FA
     */
    return (await getTwoFactorStatus()).enabled;
  } catch {
    /**
     * Output:
     * @returns null — Estado desconocido
     */
    return null;
  }
}

/**
 * Propósito: Página pública para pedir el borrado de la cuenta (Google Play exige una URL).
 * Explica los pasos en la app y, con sesión web, ofrece el borrado aquí mismo.
 */
export default async function DeleteAccountPage() {
  const [{ t }, session] = await Promise.all([getTranslator(), getSession()]);
  const isTwoFactorEnabled = session && !session.isReadOnly ? await readTwoFactorEnabled() : null;
  const contact = t("legal.pendingContact");

  /**
   * Output:
   * @returns JSX.Element — Pasos, qué se borra y formulario si hay sesión
   */
  return (
    <LegalDocument
      kicker={t("legal.deletion.kicker")}
      title={t("legal.deletion.title")}
      intro={t("legal.deletion.intro")}
      currentPath="/eliminar-cuenta"
    >
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-bone">{t("legal.deletion.appTitle")}</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-mist">
          <li>{t("legal.deletion.appStep1")}</li>
          <li>{t("legal.deletion.appStep2")}</li>
          <li>{t("legal.deletion.appStep3")}</li>
        </ol>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-bone">{t("legal.deletion.whatTitle")}</h2>
        <p className="text-sm leading-7 text-mist">{t("legal.deletion.whatDeleted")}</p>
        <p className="text-sm leading-7 text-mist">{t("legal.deletion.whatKept")}</p>
        <p className="text-sm leading-7 text-mist">{t("legal.deletion.requirements")}</p>
      </section>
      <section className="space-y-4 rounded-2xl border border-white/10 bg-ink/40 p-5">
        <h2 className="font-display text-2xl text-bone">{t("legal.deletion.webTitle")}</h2>
        {!session ? (
          <>
            <p className="text-sm text-mist">{t("legal.deletion.signedOut")}</p>
            <Link
              href="/login?next=/eliminar-cuenta"
              className={buttonClassName("secondary")}
            >
              {t("legal.deletion.signIn")}
            </Link>
          </>
        ) : session.isReadOnly ? (
          <Alert tone="info">{t("legal.deletion.readOnly")}</Alert>
        ) : (
          <DeleteAccountForm email={session.email} isTwoFactorEnabled={isTwoFactorEnabled} />
        )}
        <p className="text-xs text-mist">{t("legal.deletion.contact", { contact })}</p>
      </section>
    </LegalDocument>
  );
}
