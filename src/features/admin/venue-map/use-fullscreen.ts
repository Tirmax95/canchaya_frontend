"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Propósito: Expande un elemento a pantalla completa con la Fullscreen API y, donde no existe
 * (p. ej. Safari en iPhone), cae a un overlay fijo que cubre el viewport y se cierra con Escape.
 */
export function useFullscreen<TElement extends HTMLElement>() {
  const targetRef = useRef<TElement>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isOverlayFullscreen, setIsOverlayFullscreen] = useState(false);

  useEffect(() => {
    const syncNativeState = () =>
      setIsNativeFullscreen(
        targetRef.current !== null && document.fullscreenElement === targetRef.current,
      );
    document.addEventListener("fullscreenchange", syncNativeState);
    return () => document.removeEventListener("fullscreenchange", syncNativeState);
  }, []);

  useEffect(() => {
    if (!isOverlayFullscreen) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOverlayFullscreen(false);
      }
    };
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOverlayFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    const target = targetRef.current;
    if (!target) {
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (isOverlayFullscreen) {
      setIsOverlayFullscreen(false);
      return;
    }
    if (document.fullscreenEnabled && typeof target.requestFullscreen === "function") {
      try {
        await target.requestFullscreen();
        return;
      } catch {
        // El navegador rechazó la petición (permisos/iframe): se usa el overlay.
      }
    }
    setIsOverlayFullscreen(true);
  }, [isOverlayFullscreen]);

  /**
   * Output:
   * @returns object — Control de pantalla completa
   *   - targetRef: RefObject — Asignar al elemento a expandir
   *   - isFullscreen: boolean — True en modo nativo u overlay
   *   - isOverlayFullscreen: boolean — True solo en el modo de respaldo (requiere position: fixed)
   *   - toggleFullscreen: () => Promise<void> — Entra o sale
   */
  return {
    targetRef,
    isFullscreen: isNativeFullscreen || isOverlayFullscreen,
    isOverlayFullscreen,
    toggleFullscreen,
  };
}
