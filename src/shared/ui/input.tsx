import { cn } from "@/shared/lib/cn";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
}

/**
 * Propósito: Input tipado con label accesible y mensaje de error.
 */
export function TextField({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = id ?? props.name;
  /**
   * Output:
   * @returns JSX.Element — Campo de formulario
   */
  return (
    <label className="block space-y-1.5" htmlFor={fieldId}>
      <span className="text-sm font-medium text-mist">{label}</span>
      <input
        id={fieldId}
        className={cn(
          "w-full rounded-2xl border bg-ink/40 px-4 py-3 text-bone outline-none transition placeholder:text-mist/50 focus:border-lime/70",
          error ? "border-danger/70" : "border-white/10",
          className,
        )}
        {...props}
      />
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-mist/70">{hint}</span>
      ) : null}
    </label>
  );
}

/**
 * Propósito: Textarea con el mismo contrato visual que TextField.
 */
export function TextAreaField({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fieldId = id ?? props.name;
  /**
   * Output:
   * @returns JSX.Element — Área de texto
   */
  return (
    <label className="block space-y-1.5" htmlFor={fieldId}>
      <span className="text-sm font-medium text-mist">{label}</span>
      <textarea
        id={fieldId}
        className={cn(
          "min-h-28 w-full rounded-2xl border bg-ink/40 px-4 py-3 text-bone outline-none transition placeholder:text-mist/50 focus:border-lime/70",
          error ? "border-danger/70" : "border-white/10",
          className,
        )}
        {...props}
      />
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-mist/70">{hint}</span>
      ) : null}
    </label>
  );
}
