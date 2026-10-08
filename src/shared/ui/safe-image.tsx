import { isSafeHttpUrl } from "@/shared/lib/url";
import { cn } from "@/shared/lib/cn";

/**
 * Propósito: Renderiza imágenes remotas solo si la URL es http(s).
 * Evita XSS por javascript: y no rompe si el backend no tiene imagen.
 */
export function SafeImage({
  src,
  alt,
  className,
  fallbackLabel,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel: string;
}) {
  if (isSafeHttpUrl(src)) {
    /**
     * Output:
     * @returns JSX.Element — img remota validada
     */
    return (
      // next/image exige allowlist de hosts; las URLs de dueños son arbitrarias
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={cn("object-cover", className)} />
    );
  }

  /**
   * Output:
   * @returns JSX.Element — Fallback tipográfico si no hay imagen segura
   */
  return (
    <div
      className={cn(
        "flex items-end bg-[radial-gradient(circle_at_top,_rgba(214,242,106,0.18),_transparent_45%),linear-gradient(160deg,#102218,#08110c)] p-5",
        className,
      )}
    >
      <span className="font-display text-3xl leading-none text-lime">
        {fallbackLabel}
      </span>
    </div>
  );
}
