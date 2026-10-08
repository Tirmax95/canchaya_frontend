"use client";

import type { PickupMatch, PickupPayment } from "@/domain/pickup";
import { formatMoney } from "@/shared/lib/money";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Reserva y paga en dos pasos. El hold vence solo; el pago es explícito.
 */
export function MatchActions({
  match,
  isOwner,
  isAuthenticated,
  pendingPayment,
}: {
  match: PickupMatch;
  isOwner: boolean;
  isAuthenticated: boolean;
  pendingPayment?: PickupPayment | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    pendingPayment
      ? "Tienes un cupo reservado. Confirma el pago para no perderlo."
      : null,
  );
  const [isWorking, setIsWorking] = useState(false);
  const [paymentId, setPaymentId] = useState<number | null>(
    pendingPayment?.id ?? null,
  );
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  /**
   * Propósito: Reserva el cupo 10 minutos y abre checkout. No cobra todavía.
   */
  async function reserveSlot() {
    setIsWorking(true);
    setError(null);
    try {
      const hold = await fetch("/api/pickup/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id }),
      });
      const held = (await hold.json()) as {
        checkout?: { expiresAt?: string | null };
        message?: string;
      };
      if (!hold.ok) {
        setError(held.message ?? "No se pudo reservar");
        return;
      }
      const checkout = await fetch("/api/pickup/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id }),
      });
      const payload = (await checkout.json()) as {
        payment?: { id: number };
        message?: string;
      };
      if (!checkout.ok || !payload.payment) {
        setError(payload.message ?? "No se pudo abrir el pago");
        return;
      }
      setPaymentId(payload.payment.id);
      setExpiresAt(held.checkout?.expiresAt ?? null);
      setInfo("Cupo reservado 10 minutos. Confirma el pago para no perderlo.");
      /**
       * Output:
       * Side effects — Hold + checkout pending
       */
    } catch {
      setError("No se pudo reservar. Intenta de nuevo.");
    } finally {
      setIsWorking(false);
    }
  }

  /**
   * Propósito: Confirma el pago sandbox del checkout propio.
   */
  async function confirmPayment() {
    if (!paymentId) {
      return;
    }
    setIsWorking(true);
    setError(null);
    try {
      const approved = await fetch("/api/pickup/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", paymentId }),
      });
      const result = (await approved.json()) as { message?: string };
      if (!approved.ok) {
        setError(result.message ?? "El pago sandbox falló");
        return;
      }
      setInfo("Cupo pagado. Te esperamos en la cancha.");
      setPaymentId(null);
      router.refresh();
      /**
       * Output:
       * Side effects — Pago aprobado
       */
    } catch {
      setError("No se pudo confirmar el pago.");
    } finally {
      setIsWorking(false);
    }
  }

  /**
   * Propósito: Ejecuta una acción de organizador contra el BFF.
   */
  async function runAction(action: string) {
    setIsWorking(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/pickup/matches/${match.id}?action=${action}`,
        { method: "POST" },
      );
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "No se pudo actualizar");
        return;
      }
      router.refresh();
      /**
       * Output:
       * Side effects — Transición de estado
       */
    } catch {
      setError("No se pudo actualizar el partido.");
    } finally {
      setIsWorking(false);
    }
  }

  /**
   * Output:
   * @returns JSX.Element — Acciones de cupo u organización
   */
  return (
    <div className="space-y-3">
      {error ? <Alert>{error}</Alert> : null}
      {info ? <p className="text-sm text-lime">{info}</p> : null}
      {expiresAt ? (
        <p className="text-xs text-mist">
          El hold vence a las{" "}
          {new Date(expiresAt).toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      ) : null}
      {!isAuthenticated ? (
        <Button onClick={() => router.push("/login")}>
          Entra para reservar
        </Button>
      ) : isOwner ? (
        <div className="flex flex-wrap gap-2">
          {match.status === "draft" ? (
            <Button isLoading={isWorking} onClick={() => runAction("publish")}>
              Publicar
            </Button>
          ) : null}
          {match.status === "filled" ? (
            <Button isLoading={isWorking} onClick={() => runAction("confirm")}>
              Confirmar
            </Button>
          ) : null}
          {match.status === "confirmed" ? (
            <Button isLoading={isWorking} onClick={() => runAction("start")}>
              Empezar
            </Button>
          ) : null}
          {match.status !== "cancelled" && match.status !== "closed" ? (
            <Button
              variant="danger"
              isLoading={isWorking}
              onClick={() => runAction("cancel")}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      ) : match.status === "open" ? (
        paymentId ? (
          <Button isLoading={isWorking} onClick={confirmPayment}>
            Pagar {formatMoney(match.pricePerSlot)}
          </Button>
        ) : (
          <Button isLoading={isWorking} onClick={reserveSlot}>
            Reservar cupo
          </Button>
        )
      ) : (
        <p className="text-sm text-mist">
          Este partido ya no tiene cupos abiertos.
        </p>
      )}
    </div>
  );
}
