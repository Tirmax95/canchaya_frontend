"use client";

import { useI18n } from "@/core/i18n/provider";
import { isSafeHttpUrl } from "@/shared/lib/url";
import { useEffect, useState } from "react";

/**
 * Propósito: Galería en cuadrícula con visor a pantalla completa (Esc o clic fuera cierra,
 * flechas navegan). Solo pinta URLs http(s).
 */
export function VenueGallery({ images, venueName }: { images: string[]; venueName: string }) {
  const { t } = useI18n();
  const safeImages = images.filter((url) => isSafeHttpUrl(url));
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) {
      return;
    }
    /**
     * Propósito: Atajos de teclado del visor.
     */
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenIndex(null);
      } else if (event.key === "ArrowRight") {
        setOpenIndex((index) => (index === null ? null : (index + 1) % safeImages.length));
      } else if (event.key === "ArrowLeft") {
        setOpenIndex((index) =>
          index === null ? null : (index - 1 + safeImages.length) % safeImages.length,
        );
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [openIndex, safeImages.length]);

  if (safeImages.length === 0) {
    /**
     * Output:
     * @returns null — Sin fotos
     */
    return null;
  }

  /**
   * Output:
   * @returns JSX.Element — Cuadrícula + visor
   */
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {safeImages.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/8"
            aria-label={`${t("venue.gallery")} ${index + 1} – ${venueName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="size-full object-cover transition duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>
      {openIndex !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("venue.gallery")}
          className="fixed inset-0 z-50 grid place-items-center bg-ink/90 p-4 backdrop-blur"
          onClick={() => setOpenIndex(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={safeImages[openIndex]}
            alt={`${venueName} ${openIndex + 1}`}
            referrerPolicy="no-referrer"
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          <p className="absolute bottom-6 text-sm text-mist">
            {openIndex + 1} / {safeImages.length}
          </p>
        </div>
      ) : null}
    </>
  );
}
