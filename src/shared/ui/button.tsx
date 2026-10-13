"use client";

import { useI18n } from "@/core/i18n/provider";
import { buttonClassName, type ButtonVariant } from "@/shared/ui/button-styles";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

export { buttonClassName, type ButtonVariant } from "@/shared/ui/button-styles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

/**
 * Propósito: Botón de diseño único para CTAs de reserva y admin.
 */
export function Button({
  className,
  variant = "primary",
  isLoading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const { t } = useI18n();
  /**
   * Output:
   * @returns JSX.Element — Botón accesible con estado de carga
   */
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={buttonClassName(variant, className)}
      {...props}
    >
      {isLoading ? t("common.loading") : children}
    </button>
  );
}

/**
 * Propósito: CTA navegable sin anidar button dentro de Link (HTML inválido).
 */
export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  /**
   * Output:
   * @returns JSX.Element — Enlace con estilo de botón
   */
  return (
    <Link href={href} className={buttonClassName(variant, className)}>
      {children}
    </Link>
  );
}
