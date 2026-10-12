import { requireSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { getTwoFactorStatus } from "@/data/auth.repository";
import { AuthShell } from "@/features/auth/auth-shell";
import { TwoFactorSettings } from "@/features/auth/two-factor-settings";
import type { Metadata } from "next";

/**
 * Propósito: Título de seguridad según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("profile.securityTitle") };
}

/**
 * Propósito: Seguridad de la cuenta (verificación en dos pasos). Queda fuera de /admin para
 * que el super admin pueda llegar aquí aunque aún no tenga acceso al panel.
 */
export default async function SecurityPage() {
  const [{ t }, session] = await Promise.all([getTranslator(), requireSession()]);
  const status = await getTwoFactorStatus();
  const isMandatory = status.setupRequired || session.roles.includes("admin");

  /**
   * Output:
   * @returns JSX.Element — Ajustes de 2FA
   */
  return (
    <AuthShell
      kicker={t("auth.securityKicker")}
      title={t("auth.securityTitle")}
      subtitle={t("auth.securitySubtitle")}
    >
      <TwoFactorSettings
        isEnabled={status.enabled}
        isMandatory={isMandatory}
        recoveryCodesRemaining={status.recoveryCodesRemaining}
        continuePath={isMandatory ? "/admin/plataforma" : "/perfil"}
      />
    </AuthShell>
  );
}
