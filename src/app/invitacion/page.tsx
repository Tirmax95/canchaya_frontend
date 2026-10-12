import { getSession } from "@/core/auth/session";
import { AppError } from "@/core/errors/app-error";
import { getTranslator } from "@/core/i18n/get-locale";
import type { TranslateFn } from "@/core/i18n/translate";
import { previewInvitation, type InvitationPreview } from "@/data/team.repository";
import { OPAQUE_TOKEN_PATTERN } from "@/domain/schemas";
import { AcceptInvitationButton } from "@/features/auth/accept-invitation-button";
import { AuthShell } from "@/features/auth/auth-shell";
import { formatDateTime } from "@/shared/lib/datetime";
import { Alert } from "@/shared/ui/alert";
import { buttonClassName } from "@/shared/ui/button";
import type { Metadata } from "next";
import Link from "next/link";

/**
 * Propósito: Título de invitación según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título y referrer
   */
  return {
    title: t("auth.invitationTitle"),
    referrer: "no-referrer",
  };
}

/**
 * Propósito: Datos públicos de la invitación o el motivo por el que no sirve.
 */
async function loadInvitation(
  token: string | undefined,
  t: TranslateFn,
): Promise<{ invitation: InvitationPreview } | { errorMessage: string }> {
  if (!token || !OPAQUE_TOKEN_PATTERN.test(token)) {
    /**
     * Output:
     * @returns object — Enlace mal formado
     */
    return { errorMessage: t("auth.invitationInvalid") };
  }
  try {
    /**
     * Output:
     * @returns object — Invitación vigente
     */
    return { invitation: await previewInvitation(token) };
  } catch (error) {
    /**
     * Output:
     * @returns object — Invitación vencida, usada o inexistente
     */
    return {
      errorMessage:
        error instanceof AppError ? error.message : t("auth.invitationOpenFailed"),
    };
  }
}

/**
 * Propósito: Destino del correo de invitación. Con sesión de la cuenta invitada se acepta en un
 * clic; si no, se pide entrar (volviendo aquí) o crear la cuenta con ese correo.
 */
export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const [{ t, intlLocale }, session] = await Promise.all([getTranslator(), getSession()]);
  const result = await loadInvitation(token, t);

  if ("errorMessage" in result || !token) {
    /**
     * Output:
     * @returns JSX.Element — Aviso de enlace inválido
     */
    return (
      <AuthShell
        title={t("auth.invitationUnavailable")}
        subtitle={t("auth.invitationUnavailableSubtitle")}
      >
        <Alert>
          {"errorMessage" in result ? result.errorMessage : t("auth.invitationInvalid")}
        </Alert>
      </AuthShell>
    );
  }

  const { invitation } = result;
  const loginHref = `/login?next=${encodeURIComponent(`/invitacion?token=${token}`)}`;
  const isInvitedAccount = session?.email.toLowerCase() === invitation.email.toLowerCase();
  const inviterName = invitation.inviterName ?? t("common.noOwner");

  /**
   * Output:
   * @returns JSX.Element — Invitación con la acción que corresponde
   */
  return (
    <AuthShell
      kicker={t("auth.invitationKicker")}
      title={t("auth.joinOrg", { name: invitation.organizationName })}
      subtitle={t("auth.invitedAsManager", { name: inviterName })}
    >
      <div className="space-y-5">
        <p className="text-sm text-mist">
          {t("auth.invitationFor", {
            email: invitation.email,
            date: formatDateTime(invitation.expiresAt, intlLocale),
          })}
        </p>
        {isInvitedAccount ? (
          <AcceptInvitationButton token={token} />
        ) : session ? (
          <div className="space-y-3">
            <Alert>
              {t("auth.wrongAccount", {
                current: session.email,
                expected: invitation.email,
              })}
            </Alert>
          </div>
        ) : (
          <div className="space-y-3">
            <Link href={loginHref} className={buttonClassName("primary", "w-full justify-center")}>
              {t("auth.loginToAccept")}
            </Link>
            <p className="text-center text-xs text-mist">
              {t("auth.invitationNoAccount")}{" "}
              <Link href="/registro" className="text-lime hover:underline">
                {t("auth.registerWithEmail", { email: invitation.email })}
              </Link>{" "}
              {t("auth.invitationReopenHint")}
            </p>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
