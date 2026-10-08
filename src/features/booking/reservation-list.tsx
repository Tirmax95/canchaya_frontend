"use client";

import { isStaff } from "@/core/auth/roles";
import type { ReservationView } from "@/domain/reservation";
import type { SessionUser } from "@/domain/user";
import { formatDateTime } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";
import { StatusBadge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Lista reservas y ejecuta cancelar/confirmar con autorización en BFF.
 */
export function ReservationList({
  reservations,
  user,
  showUserId = false,
}: {
  reservations: ReservationView[];
  user: SessionUser;
  showUserId?: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Propósito: Llama un endpoint de mutación y refresca la vista.
   */
  async function mutate(path: string, reservationId: number) {
    setPendingId(reservationId);
    setError(null);
    const response = await fetch(path, { method: "PUT" });
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    if (!response.ok) {
      setError(payload.message ?? "No se pudo actualizar la reserva");
    } else {
      router.refresh();
    }
    setPendingId(null);
  }

  if (reservations.length === 0) {
    /**
     * Output:
     * @returns JSX.Element — Empty state
     */
    return (
      <EmptyState
        title="Aún no hay partidos"
        description="Reserva una cancha y tu agenda aparecerá aquí."
        action={
          <Link href="/canchas" className="text-lime hover:underline">
            Ver canchas
          </Link>
        }
      />
    );
  }

  /**
   * Output:
   * @returns JSX.Element — Lista de reservas
   */
  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {reservations.map((reservation) => {
        const canCancel =
          reservation.status === "pending" || reservation.status === "confirmed";
        const canConfirm =
          isStaff(user) && reservation.status === "pending";
        return (
          <article
            key={reservation.reservationId}
            className="rounded-[24px] border border-white/8 bg-pitch p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-lime">
                  {reservation.establishmentName}
                </p>
                <h3 className="mt-1 font-display text-2xl text-bone">
                  {reservation.fieldName}
                </h3>
                <p className="mt-2 text-sm text-mist">
                  {formatDateTime(reservation.startTime)} →{" "}
                  {formatDateTime(reservation.endTime)}
                </p>
                {showUserId ? (
                  <p className="mt-1 text-xs text-mist">
                    Jugador #{reservation.userId}
                  </p>
                ) : null}
                {reservation.notes ? (
                  <p className="mt-2 text-sm text-bone/80">{reservation.notes}</p>
                ) : null}
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <StatusBadge status={reservation.status} />
                <p className="text-sm text-bone">
                  {formatMoney(reservation.priceEstimate)}
                </p>
                <div className="flex gap-2">
                  {canConfirm ? (
                    <Button
                      variant="primary"
                      isLoading={pendingId === reservation.reservationId}
                      onClick={() =>
                        mutate(
                          `/api/reservations/${reservation.reservationId}/confirm`,
                          reservation.reservationId,
                        )
                      }
                    >
                      Confirmar
                    </Button>
                  ) : null}
                  {canCancel ? (
                    <Button
                      variant="danger"
                      isLoading={pendingId === reservation.reservationId}
                      onClick={() =>
                        mutate(
                          `/api/reservations/${reservation.reservationId}/cancel`,
                          reservation.reservationId,
                        )
                      }
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
