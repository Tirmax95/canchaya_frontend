import { getSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import type { MessageKey } from "@/core/i18n/messages";
import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";
import { Alert } from "@/shared/ui/alert";
import { toSafeInternalPath } from "@/shared/lib/url";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

const LOGIN_NOTICE_KEYS: Record<string, MessageKey> = {
  sesion: "auth.noticeSession",
  clave: "auth.noticePassword",
  "2fa": "auth.noticeTwoFactor",
};

/**
 * Propósito: Título de la página de acceso según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado; `no-referrer` porque `next` puede llevar el token
   *   de una invitación
   */
  return { title: t("auth.loginTitle"), referrer: "no-referrer" };
}

/**
 * Propósito: Página de acceso. Si ya hay sesión, evita el formulario.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; motivo?: string }>;
}) {
  const [{ t }, session, params] = await Promise.all([
    getTranslator(),
    getSession(),
    searchParams,
  ]);
  const nextPath = toSafeInternalPath(params.next);
  if (session) {
    redirect(nextPath ?? "/reservas");
  }
  const noticeKey = params.motivo ? LOGIN_NOTICE_KEYS[params.motivo] : undefined;
  const notice = noticeKey ? t(noticeKey) : undefined;

  /**
   * Output:
   * @returns JSX.Element — Auth layout
   */
  return (
    <AuthShell title={t("auth.loginHeading")} subtitle={t("auth.loginSubtitle")}>
      {notice ? (
        <div className="mb-5">
          <Alert tone="info">{notice}</Alert>
        </div>
      ) : null}
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}
