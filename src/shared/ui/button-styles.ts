import { cn } from "@/shared/lib/cn";

/**
 * Estilos del botón sin "use client": los Server Components pueden usarlos para dar look de
 * CTA a un enlace (llamar una función de un módulo cliente desde el servidor falla).
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

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
