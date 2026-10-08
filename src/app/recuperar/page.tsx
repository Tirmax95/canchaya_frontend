import { AuthShell } from "@/features/auth/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Recuperar contraseña" };

/**
 * Propósito: Solicitud del enlace para restablecer la contraseña.
 */
export default function ForgotPasswordPage() {
  /**
   * Output:
   * @returns JSX.Element — Formulario de recuperación
   */
  return (
    <AuthShell
      title="¿Olvidaste tu contraseña?"
      subtitle="Escribe el correo de tu cuenta y te enviamos un enlace para crear una nueva."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
