import { cn } from "@/shared/lib/cn";

/**
 * Propósito: Alerta de error o info para formularios y páginas vacías de API.
 */
export function Alert({
  children,
  tone = "danger",
}: {
  children: React.ReactNode;
  tone?: "danger" | "info";
}) {
  /**
   * Output:
   * @returns JSX.Element — Caja de mensaje
   */
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "danger"
          ? "border-danger/30 bg-danger/10 text-[#ffd2cc]"
          : "border-lime/20 bg-lime/8 text-bone",
      )}
    >
      {children}
    </div>
  );
}
