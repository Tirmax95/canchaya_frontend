import { requireSession } from "@/core/auth/session";
import { getTwoFactorStatus } from "@/data/auth.repository";
import { AuthShell } from "@/features/auth/auth-shell";
import { TwoFactorSettings } from "@/features/auth/two-factor-settings";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Seguridad de la cuenta" };

/**
 * Propósito: Seguridad de la cuenta (verificación en dos pasos). Queda fuera de /admin para
 * que el super admin pueda llegar aquí aunque aún no tenga acceso al panel.
 */
export default async function SecurityPage() {
  const session = await requireSession();
  const status = await getTwoFactorStatus();
  const isMandatory = status.setupRequired || session.roles.includes("admin");

  /**
   * Output:
   * @returns JSX.Element — Ajustes de 2FA
   */
  return (
    <AuthShell
      kicker="Tu cuenta"
      title="Verificación en dos pasos"
      subtitle="Protege tu cuenta con un código de tu teléfono además de la contraseña."
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
