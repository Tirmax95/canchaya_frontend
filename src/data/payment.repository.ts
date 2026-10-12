import { requestAuthedBackend } from "@/core/http/backend-client";
import {
  isAllowedCheckoutUrl,
  PAYMENT_INTENT_STATUSES,
  type AdminPaymentGateway,
  type AdminPendingIntent,
  type PublicPaymentIntent,
  type ReservationPaymentContext,
} from "@/domain/payments";

/**
 * Propósito: Contexto de cobro de una reserva propia.
 */
export async function getReservationPaymentContext(
  reservationId: number,
): Promise<ReservationPaymentContext> {
  const payload = await requestAuthedBackend<ReservationPaymentContext>({
    path: `/reservations/${reservationId}/payment`,
  });
  /**
   * Output:
   * @returns ReservationPaymentContext — Reserva, métodos e intento
   */
  return sanitizeCheckoutContext(payload);
}

/**
 * Propósito: Abre el checkout del método elegido.
 */
export async function createReservationCheckout(
  reservationId: number,
  methodId: number,
): Promise<PublicPaymentIntent> {
  const payload = await requestAuthedBackend<PublicPaymentIntent>({
    path: `/reservations/${reservationId}/checkout`,
    method: "POST",
    body: { method_id: methodId },
  });
  /**
   * Output:
   * @returns PublicPaymentIntent — URL o instrucciones
   */
  return sanitizeIntent(payload);
}

/**
 * Propósito: Confirma sandbox / llave en modo prueba.
 */
export async function confirmReservationPaymentLocally(
  reservationId: number,
): Promise<PublicPaymentIntent> {
  const payload = await requestAuthedBackend<PublicPaymentIntent>({
    path: `/reservations/${reservationId}/payments/confirm-local`,
    method: "POST",
  });
  /**
   * Output:
   * @returns PublicPaymentIntent — Intent aprobado
   */
  return sanitizeIntent(payload);
}

/**
 * Propósito: Verifica la transacción al volver de Wompi.
 */
export async function verifyReservationPayment(
  reservationId: number,
  transactionId: string,
): Promise<PublicPaymentIntent> {
  const payload = await requestAuthedBackend<PublicPaymentIntent>({
    path: `/reservations/${reservationId}/payments/verify`,
    method: "POST",
    body: { transaction_id: transactionId },
  });
  /**
   * Output:
   * @returns PublicPaymentIntent — Estado tras consultar Wompi
   */
  return sanitizeIntent(payload);
}

/**
 * Propósito: Catálogo del super admin + transferencias llave pendientes.
 */
export async function listPaymentGateways(): Promise<{
  gateways: AdminPaymentGateway[];
  pendingIntents: AdminPendingIntent[];
}> {
  const payload = await requestAuthedBackend<{
    gateways?: AdminPaymentGateway[];
    pendingIntents?: AdminPendingIntent[];
  }>({ path: "/platform/payments/gateways" });
  /**
   * Output:
   * @returns object — Catálogo y pending manuales
   */
  return {
    gateways: Array.isArray(payload.gateways) ? payload.gateways : [],
    pendingIntents: Array.isArray(payload.pendingIntents) ? payload.pendingIntents : [],
  };
}

/**
 * Propósito: Enciende/apaga pasarela, modo prueba y config pública.
 */
export async function updatePaymentGateway(
  code: string,
  patch: {
    isEnabled?: boolean;
    isTestMode?: boolean;
    publicConfig?: Record<string, string>;
  },
): Promise<void> {
  await requestAuthedBackend({
    path: `/platform/payments/gateways/${encodeURIComponent(code)}`,
    method: "PUT",
    body: {
      is_enabled: patch.isEnabled,
      is_test_mode: patch.isTestMode,
      public_config: patch.publicConfig,
    },
  });
  /**
   * Output:
   * Side effects — Pasarela actualizada
   */
}

/**
 * Propósito: Guarda llaves. Solo envía campos con valor (los vacíos no pisan).
 */
export async function updatePaymentGatewayCredentials(
  code: string,
  credentials: Record<string, string>,
): Promise<void> {
  await requestAuthedBackend({
    path: `/platform/payments/gateways/${encodeURIComponent(code)}/credentials`,
    method: "PUT",
    body: { credentials },
  });
  /**
   * Output:
   * Side effects — Llaves cifradas en el backend
   */
}

/**
 * Propósito: Enciende o apaga un método para el checkout del jugador.
 */
export async function togglePaymentMethod(methodId: number, isEnabled: boolean): Promise<void> {
  await requestAuthedBackend({
    path: `/platform/payments/methods/${methodId}`,
    method: "PUT",
    body: { is_enabled: isEnabled },
  });
  /**
   * Output:
   * Side effects — Flag actualizado
   */
}

/**
 * Propósito: Liquida a mano una transferencia llave/Bre-B.
 */
export async function settleManualPaymentIntent(reference: string): Promise<void> {
  await requestAuthedBackend({
    path: "/platform/payments/intents/settle",
    method: "POST",
    body: { reference },
  });
  /**
   * Output:
   * Side effects — Reserva confirmada
   */
}

/**
 * Propósito: Descarta URLs que no sean Wompi. El backend ya las genera; esto es defensa extra.
 */
function sanitizeIntent(intent: PublicPaymentIntent): PublicPaymentIntent {
  const status = PAYMENT_INTENT_STATUSES.includes(intent.status) ? intent.status : "error";
  /**
   * Output:
   * @returns PublicPaymentIntent — checkoutUrl allowlisteada
   */
  return {
    ...intent,
    status,
    checkoutUrl: isAllowedCheckoutUrl(intent.checkoutUrl) ? intent.checkoutUrl : null,
  };
}

/**
 * Propósito: Normaliza el contexto por si el backend omite arreglos.
 */
function sanitizeCheckoutContext(payload: ReservationPaymentContext): ReservationPaymentContext {
  /**
   * Output:
   * @returns ReservationPaymentContext — methods e intent seguros
   */
  return {
    ...payload,
    methods: Array.isArray(payload.methods) ? payload.methods : [],
    intent: payload.intent ? sanitizeIntent(payload.intent) : null,
  };
}
