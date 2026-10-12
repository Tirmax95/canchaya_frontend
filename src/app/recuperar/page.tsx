import { getTranslator } from "@/core/i18n/get-locale";
import { AuthShell } from "@/features/auth/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import type { Metadata } from "next";

/**
 * Propósito: Título de recuperación según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("auth.forgotTitle") };
}

/**
 * Propósito: Solicitud del enlace para restablecer la contraseña.
 */
export default async function ForgotPasswordPage() {
  const { t } = await getTranslator();

  /**
   * Output:
   * @returns JSX.Element — Formulario de recuperación
   */
  return (
    <AuthShell title={t("auth.forgotTitle")} subtitle={t("auth.forgotSubtitle")}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
