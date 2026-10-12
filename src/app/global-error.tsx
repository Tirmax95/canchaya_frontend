"use client";

import { readBrowserLocale } from "@/core/i18n/read-browser-locale";
import { createTranslator } from "@/core/i18n/translate";
import { reportClientError } from "@/widgets/client-error-reporter";
import { useEffect, useMemo } from "react";

/**
 * Propósito: Error boundary del layout raíz. Incluye html/body porque sustituye todo el
 * documento. El fallo se registra en la bitácora.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = readBrowserLocale();
  const { t } = useMemo(() => createTranslator(locale), [locale]);

  useEffect(() => {
    reportClientError({
      name: error.name,
      message: error.digest ? `${error.message} [${error.digest}]` : error.message,
      stack: error.stack,
    });
  }, [error]);

  /**
   * Output:
   * @returns JSX.Element — Documento mínimo de recuperación
   */
  return (
    <html lang={locale}>
      <body style={{ background: "#08110c", color: "#f4efe4", fontFamily: "sans-serif" }}>
        <main style={{ maxWidth: 560, margin: "6rem auto", padding: "0 1rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem" }}>{t("errors.title")}</h1>
          <p style={{ color: "#c8d4cc" }}>{t("errors.descriptionShort")}</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              borderRadius: 999,
              background: "#d6f26a",
              color: "#08110c",
              border: 0,
              padding: "10px 20px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("common.retry")}
          </button>
        </main>
      </body>
    </html>
  );
}
