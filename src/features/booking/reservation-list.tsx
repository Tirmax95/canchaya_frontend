"use client";

import { isStaff } from "@/core/auth/roles";
import { useI18n } from "@/core/i18n/provider";
import { isExpiredReservation, type ReservationView } from "@/domain/reservation";
import type { ClientSessionUser } from "@/domain/user";
import { useReservationActions } from "@/features/booking/use-reservation-actions";
import { formatDateTime } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";
import { StatusBadge } from "@/shared/ui/badge";
import { ReservationDeadline } from "@/features/booking/reservation-deadline";
import { Button, ButtonLink } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import Link from "next/link";

/**
 * Propósito: Lista las reservas del jugador (o un recorte simple) y dispara cancelar/pagar.
 */
export function ReservationList({
  reservations,
  user,
  showUserId = false,
  canModerate = false,
}: {
  reservations: ReservationView[];
  user: ClientSessionUser;
  showUserId?: boolean;
  /** Staff con el módulo de reservas habilitado (resuelto en servidor). */
  canModerate?: boolean;
}) {
  const { t, intlLocale } = useI18n();
  const { pendingId, error, confirmationDialog, requestReservationChange } =
    useReservationActions();

  if (reservations.length === 0) {
    /**
     * Output:
     * @returns JSX.Element — Empty state
     */
    return (
      <EmptyState
        title={t("booking.emptyTitle")}
        description={t("booking.emptyDescription")}
        action={
          <Link href="/canchas" className="text-lime hover:underline">
            {t("booking.seeCourts")}
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
      {confirmationDialog}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {reservations.map((reservation) => {
        const canCancel =
          reservation.status === "pending" || reservation.status === "confirmed";
        const canConfirm = canModerate && reservation.status === "pending";
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
                  {formatDateTime(reservation.startTime, intlLocale)} →{" "}
                  {formatDateTime(reservation.endTime, intlLocale)}
                </p>
                {showUserId ? (
                  <p className="mt-1 text-xs text-mist">
                    {t("booking.playerNumber", { id: reservation.userId })}
                  </p>
                ) : null}
                {reservation.notes ? (
                  <p className="mt-2 text-sm text-bone/80">{reservation.notes}</p>
                ) : null}
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <StatusBadge
                  status={reservation.status}
                  isExpired={isExpiredReservation(reservation)}
                />
                {reservation.status === "pending" && reservation.expiresAt ? (
                  <ReservationDeadline expiresAt={reservation.expiresAt} />
                ) : null}
                <p className="text-sm text-bone">
                  {formatMoney(reservation.priceEstimate, intlLocale, t("common.consult"))}
                </p>
                <div className="flex gap-2">
                  {!isStaff(user) && reservation.status === "pending" ? (
                    <ButtonLink href={`/reservas/${reservation.reservationId}/pagar`}>
                      {t("booking.pay")}
                    </ButtonLink>
                  ) : null}
                  {canConfirm ? (
                    <Button
                      variant="primary"
                      isLoading={pendingId === reservation.reservationId}
                      disabled={user.isReadOnly}
                      onClick={() =>
                        requestReservationChange(reservation.reservationId, "confirm")
                      }
                    >
                      {t("booking.confirm")}
                    </Button>
                  ) : null}
                  {canCancel ? (
                    <Button
                      variant="danger"
                      isLoading={pendingId === reservation.reservationId}
                      disabled={user.isReadOnly}
                      onClick={() =>
                        requestReservationChange(reservation.reservationId, "cancel")
                      }
                    >
                      {t("booking.cancel")}
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
