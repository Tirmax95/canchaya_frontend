"use client";

import { useI18n } from "@/core/i18n/provider";
import { formatDateTime } from "@/shared/lib/datetime";
import { useEffect, useState } from "react";

const COUNTDOWN_THRESHOLD_MS = 60 * 60 * 1000;
const TICK_MS = 1000;

type DeadlineMode = "pay" | "confirm" | "generic";

/**
 * Propósito: mm:ss (o h:mm:ss) de lo que falta.
 */
function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  /**
   * Output:
   * @returns string — Tiempo restante legible
   */
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Propósito: Aviso del plazo de una reserva pendiente. Con menos de 1 h muestra cuenta
 * regresiva; si ya venció, avisa que el horario se liberará (el job corre cada pocos minutos).
 */
export function ReservationDeadline({
  expiresAt,
  mode = "generic",
  className,
}: {
  expiresAt: string;
  mode?: DeadlineMode;
  className?: string;
}) {
  const { t, intlLocale } = useI18n();
  const deadlineMs = new Date(expiresAt).getTime();
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  if (!Number.isFinite(deadlineMs)) {
    /**
     * Output:
     * @returns null — Fecha inválida, no se muestra nada
     */
    return null;
  }

  const remainingMs = nowMs === null ? Number.POSITIVE_INFINITY : deadlineMs - nowMs;
  const time = formatDateTime(expiresAt, intlLocale);
  let message: string;
  if (remainingMs <= 0) {
    message = t("booking.deadlinePassed");
  } else if (remainingMs <= COUNTDOWN_THRESHOLD_MS) {
    message = t("booking.deadlineCountdown", { time: formatRemaining(remainingMs) });
  } else if (mode === "pay") {
    message = t("booking.deadlinePay", { time });
  } else if (mode === "confirm") {
    message = t("booking.deadlineConfirm", { time });
  } else {
    message = t("booking.deadlineGeneric", { time });
  }
  const isUrgent = remainingMs <= COUNTDOWN_THRESHOLD_MS;

  /**
   * Output:
   * @returns JSX.Element — Aviso con el plazo (rol status para lectores de pantalla)
   */
  return (
    <p
      role="status"
      className={`text-xs ${isUrgent ? "font-semibold text-clay" : "text-mist"} ${className ?? ""}`}
    >
      {message}
    </p>
  );
}
