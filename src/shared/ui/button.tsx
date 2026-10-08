import { cn } from "@/shared/lib/cn";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-lime text-ink hover:bg-flare shadow-[0_0_0_1px_rgba(214,242,106,0.3)]",
  secondary:
    "bg-white/8 text-bone border border-white/12 hover:bg-white/14",
  ghost: "bg-transparent text-bone hover:bg-white/8",
  danger: "bg-danger text-white hover:bg-[#d24b3c]",
};

/**
 * Propósito: Clases compartidas entre botón nativo y enlace con look de CTA.
 */
export function buttonClassName(
  variant: ButtonVariant = "primary",
  className?: string,
): string {
  /**
   * Output:
   * @returns string — className del CTA
   */
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    className,
  );
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
      {isLoading ? "Cargando…" : children}
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
