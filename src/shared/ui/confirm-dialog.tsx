"use client";

import { useI18n } from "@/core/i18n/provider";
import { buttonClassName } from "@/shared/ui/button";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

export type ConfirmActionTone = "primary" | "danger";

export interface ConfirmActionRequest {
  title: string;
  description: string;
  confirmLabel: string;
  dismissLabel?: string;
  tone?: ConfirmActionTone;
  run: () => Promise<void> | void;
}

interface StoredConfirmRequest {
  title: string;
  description: string;
  confirmLabel: string;
  dismissLabel: string;
  tone: ConfirmActionTone;
  run: () => Promise<void> | void;
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

/**
 * Propósito: Lista los controles que el teclado puede alcanzar dentro del modal.
 */
function listFocusableControls(dialog: HTMLElement): HTMLElement[] {
  /**
   * Output:
   * @returns HTMLElement[] — Controles enfocables, en orden de tabulación
   */
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Propósito: Mantiene el foco dentro del diálogo para que Tab no se escape a la página de atrás.
 */
function trapTabKey(event: KeyboardEvent<HTMLDivElement>, dialog: HTMLElement): void {
  if (event.key !== "Tab") {
    /**
     * Output:
     * Side effects — Ignora teclas que no sean Tab
     */
    return;
  }

  const focusableControls = listFocusableControls(dialog);
  const firstControl = focusableControls[0];
  const lastControl = focusableControls[focusableControls.length - 1];
  if (!firstControl || !lastControl) {
    event.preventDefault();
    /**
     * Output:
     * Side effects — No hay controles; el foco se queda en el diálogo
     */
    return;
  }

  const activeElement = document.activeElement;
  const isShiftOnFirst = event.shiftKey && activeElement === firstControl;
  const isTabOnLast = !event.shiftKey && activeElement === lastControl;
  if (isShiftOnFirst) {
    event.preventDefault();
    lastControl.focus();
  } else if (isTabOnLast) {
    event.preventDefault();
    firstControl.focus();
  }
  /**
   * Output:
   * Side effects — Si el foco iba a salir, lo devuelve al otro extremo del diálogo
   */
}

/**
 * Propósito: Pide una segunda pulsación antes de confirmar o cancelar, para que un clic
 * accidental no cambie reservas, pagos ni cuentas. El texto se pinta como texto, nunca como HTML.
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  dismissLabel,
  tone,
  isConfirming,
  onConfirm,
  onDismiss,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  dismissLabel: string;
  tone: ConfirmActionTone;
  isConfirming: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      /**
       * Output:
       * Side effects — No hay diálogo que enfocar
       */
      return;
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    /**
     * Output:
     * Side effects — Bloquea el scroll y devuelve el foco al control que abrió el modal
     */
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") {
    /**
     * Output:
     * @returns null — El modal está cerrado o todavía no hay documento
     */
    return null;
  }

  const accentClassName = tone === "danger" ? "bg-danger" : "bg-lime";

  /**
   * Output:
   * @returns React.ReactPortal — Diálogo por encima del resto de la página
   */
  return createPortal(
    <div
      className="confirm-shade-in fixed inset-0 z-[120] flex items-end justify-center bg-ink/80 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isConfirming) {
          onDismiss();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="confirm-card-in relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-pitch shadow-[0_24px_80px_rgba(0,0,0,0.45)] outline-none"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            if (!isConfirming) {
              onDismiss();
            }
            return;
          }
          if (dialogRef.current) {
            trapTabKey(event, dialogRef.current);
          }
        }}
      >
        <div className={`h-1.5 ${accentClassName}`} />
        <div className="pointer-events-none absolute inset-3 rounded-[22px] border border-white/6" />
        <div className="relative px-6 py-6 sm:px-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-lime">
            {t("common.confirmPlay")}
          </p>
          <h2 id={titleId} className="mt-2 font-display text-3xl leading-tight text-bone">
            {title}
          </h2>
          <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-mist">
            {description}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className={buttonClassName("secondary")}
              disabled={isConfirming}
              onClick={onDismiss}
            >
              {dismissLabel}
            </button>
            <button
              type="button"
              className={buttonClassName(tone === "danger" ? "danger" : "primary")}
              disabled={isConfirming}
              aria-busy={isConfirming}
              onClick={onConfirm}
            >
              {isConfirming ? t("common.loading") : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Propósito: Abre un solo modal de confirmación por pantalla y ejecuta la acción solo si
 * la persona acepta. Mientras corre, ignora otro clic para no duplicar la mutación.
 */
export function useConfirmAction() {
  const { t } = useI18n();
  const [request, setRequest] = useState<StoredConfirmRequest | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const isConfirmingRef = useRef(false);
  const backLabel = t("common.back");

  /**
   * Propósito: Guarda la acción pendiente. No abre otro modal si ya hay una en curso.
   */
  function askConfirmation(nextRequest: ConfirmActionRequest): void {
    if (isConfirmingRef.current) {
      /**
       * Output:
       * Side effects — Ignora el pedido porque la acción anterior sigue en curso
       */
      return;
    }

    const title = nextRequest.title.trim();
    const description = nextRequest.description.trim();
    const confirmLabel = nextRequest.confirmLabel.trim();
    if (title.length === 0 || description.length === 0 || confirmLabel.length === 0) {
      /**
       * Output:
       * Side effects — No abre el modal si falta el texto que la persona debe leer
       */
      return;
    }

    setRequest({
      title,
      description,
      confirmLabel,
      dismissLabel: nextRequest.dismissLabel?.trim() || backLabel,
      tone: nextRequest.tone ?? "primary",
      run: nextRequest.run,
    });
    /**
     * Output:
     * Side effects — Muestra el modal con la acción pendiente
     */
  }

  /**
   * Propósito: Cierra el modal sin ejecutar la acción.
   */
  function dismissConfirmation(): void {
    if (isConfirmingRef.current) {
      /**
       * Output:
       * Side effects — No cierra mientras la acción ya se está ejecutando
       */
      return;
    }
    setRequest(null);
    /**
     * Output:
     * Side effects — Oculta el modal
     */
  }

  /**
   * Propósito: Ejecuta la acción aceptada y cierra el modal al terminar, haya salido bien o no.
   * El error lo muestra la pantalla que pidió la confirmación.
   */
  async function acceptConfirmation(): Promise<void> {
    if (!request || isConfirmingRef.current) {
      /**
       * Output:
       * Side effects — No hay acción pendiente o ya se está ejecutando
       */
      return;
    }

    isConfirmingRef.current = true;
    setIsConfirming(true);
    try {
      await request.run();
    } catch {
      // La pantalla que abrió el modal muestra su propio mensaje.
    } finally {
      isConfirmingRef.current = false;
      setIsConfirming(false);
      setRequest(null);
    }
    /**
     * Output:
     * Side effects — La acción terminó y el modal se cerró
     */
  }

  const confirmationDialog = (
    <ConfirmDialog
      isOpen={request !== null}
      title={request?.title ?? ""}
      description={request?.description ?? ""}
      confirmLabel={request?.confirmLabel ?? ""}
      dismissLabel={request?.dismissLabel ?? backLabel}
      tone={request?.tone ?? "primary"}
      isConfirming={isConfirming}
      onConfirm={() => {
        void acceptConfirmation();
      }}
      onDismiss={dismissConfirmation}
    />
  );

  /**
   * Output:
   * @returns object — Pedir confirmación y el modal que hay que renderizar
   *   - askConfirmation: (request: ConfirmActionRequest) => void — Abre el modal
   *   - confirmationDialog: React.ReactNode — Portal del diálogo, o null si está cerrado
   */
  return { askConfirmation, confirmationDialog };
}
