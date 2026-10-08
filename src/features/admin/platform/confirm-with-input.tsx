"use client";

import { cn } from "@/shared/lib/cn";
import { useId, useState } from "react";

/**
 * Propósito: Botón que despliega un campo obligatorio (motivo, referencia de pago) y una
 * confirmación, para acciones sensibles sin modales. El valor se valida otra vez en servidor.
 */
export function ConfirmWithInput({
  triggerLabel,
  inputLabel,
  placeholder,
  confirmLabel,
  minLength = 3,
  maxLength,
  tone = "danger",
  isPending,
  onConfirm,
}: {
  triggerLabel: string;
  inputLabel: string;
  placeholder?: string;
  confirmLabel: string;
  minLength?: number;
  maxLength: number;
  tone?: "danger" | "primary";
  isPending: boolean;
  onConfirm: (value: string) => Promise<boolean>;
}) {
  const inputId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const trimmedValue = inputValue.trim();
  const toneClassName =
    tone === "danger"
      ? "border-danger/40 text-danger hover:bg-danger/10"
      : "border-lime/40 text-lime hover:bg-lime/10";

  /**
   * Propósito: Confirma y colapsa solo si la acción tuvo éxito (si falla, conserva lo escrito).
   */
  async function handleConfirm() {
    if (await onConfirm(trimmedValue)) {
      setIsOpen(false);
      setInputValue("");
    }
  }

  if (!isOpen) {
    /**
     * Output:
     * @returns JSX.Element — Botón que abre el formulario
     */
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", toneClassName)}
      >
        {triggerLabel}
      </button>
    );
  }
  /**
   * Output:
   * @returns JSX.Element — Campo + confirmar/cancelar
   */
  return (
    <div className="flex w-full flex-wrap items-end gap-2">
      <label htmlFor={inputId} className="min-w-[220px] flex-1 space-y-1">
        <span className="text-[11px] font-medium text-mist">{inputLabel}</span>
        <input
          id={inputId}
          autoFocus
          value={inputValue}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
          className="w-full rounded-xl border border-white/10 bg-ink/40 px-3 py-2 text-sm text-bone outline-none focus:border-lime/70"
        />
      </label>
      <button
        type="button"
        disabled={isPending || trimmedValue.length < minLength}
        onClick={handleConfirm}
        className={cn(
          "rounded-full border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
          toneClassName,
        )}
      >
        {isPending ? "Guardando…" : confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="rounded-full px-3 py-2 text-xs text-mist hover:text-bone"
      >
        Cancelar
      </button>
    </div>
  );
}
