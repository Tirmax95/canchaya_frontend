import { requestAuthedBackend, requestBackend } from "@/core/http/backend-client";
import { sanitizeIntent } from "@/data/payment.repository";
import type {
  EventDetail,
  EventSummary,
  MyEventRegistration,
  RegistrationCheckoutContext,
} from "@/domain/events";
import type { PublicPaymentIntent } from "@/domain/payments";
import type {
  EventActionInput,
  EventListQuery,
  ManageRegistrationInput,
  MatchUpdateInput,
} from "@/domain/schemas";

/** Ruta del backend para cada acción de ciclo de vida o de competencia. */
const EVENT_ACTION_PATHS: Record<EventActionInput["action"], string> = {
  publish: "publish",
  close_registration: "close-registration",
  reopen_registration: "reopen-registration",
  start: "start",
  complete: "complete",
  cancel: "cancel",
  regenerate_fixture: "fixture",
  generate_knockout: "knockout",
};

/**
 * Propósito: Arreglo seguro aunque el backend omita la clave.
 */
function asArray<T>(value: unknown): T[] {
  /**
   * Output:
   * @returns T[] — Lista o vacío
   */
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Propósito: Catálogo público de eventos con filtros (sin sesión).
 */
export async function listPublicEvents(query: EventListQuery = {}): Promise<EventSummary[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  const payload = await requestBackend<{ events?: unknown }>({
    path: `/events${search ? `?${search}` : ""}`,
  });
  /**
   * Output:
   * @returns EventSummary[] — Eventos publicados
   */
  return asArray<EventSummary>(payload.events);
}

/**
 * Propósito: Ficha del evento. Reenvía la sesión si existe (organizador o inscrito ven más).
 */
export async function getEventDetail(eventId: number): Promise<EventDetail> {
  const payload = await requestAuthedBackend<EventDetail>({ path: `/events/${eventId}` });
  /**
   * Output:
   * @returns EventDetail — Evento, equipos, fixture, tablas
   */
  return {
    ...payload,
    teams: asArray(payload.teams),
    matches: asArray(payload.matches),
    standings: asArray(payload.standings),
    viewer: {
      canManage: payload.viewer?.canManage === true,
      myRegistrations: asArray(payload.viewer?.myRegistrations),
    },
  };
}

/**
 * Propósito: Eventos de los tenants del organizador.
 */
export async function listManagedEvents(): Promise<EventSummary[]> {
  const payload = await requestAuthedBackend<{ events?: unknown }>({ path: "/events/manage/mine" });
  /**
   * Output:
   * @returns EventSummary[] — Todos los estados
   */
  return asArray<EventSummary>(payload.events);
}

/**
 * Propósito: Inscripciones de los equipos del usuario.
 */
export async function listMyEventRegistrations(): Promise<MyEventRegistration[]> {
  const payload = await requestAuthedBackend<{ registrations?: unknown }>({
    path: "/events/registrations/mine",
  });
  /**
   * Output:
   * @returns MyEventRegistration[] — Inscripción + evento
   */
  return asArray<MyEventRegistration>(payload.registrations);
}

/**
 * Propósito: Crea un evento en borrador.
 */
export async function createEvent(input: Record<string, unknown>): Promise<{ eventId: number }> {
  const payload = await requestAuthedBackend<{ event: { eventId: number } }>({
    path: "/events",
    method: "POST",
    body: input,
  });
  /**
   * Output:
   * @returns object — Id del evento creado
   */
  return { eventId: payload.event.eventId };
}

/**
 * Propósito: Edita un evento.
 */
export async function updateEvent(eventId: number, input: Record<string, unknown>): Promise<void> {
  await requestAuthedBackend({ path: `/events/${eventId}`, method: "PUT", body: input });
  /**
   * Output:
   * Side effects — Evento actualizado
   */
}

/**
 * Propósito: Ejecuta una acción de ciclo de vida o de competencia.
 */
export async function runEventAction(eventId: number, input: EventActionInput): Promise<void> {
  const { action, ...body } = input;
  await requestAuthedBackend({
    path: `/events/${eventId}/${EVENT_ACTION_PATHS[action]}`,
    method: "POST",
    body,
  });
  /**
   * Output:
   * Side effects — Estado o fixture actualizado
   */
}

/**
 * Propósito: Programa un partido o carga su resultado.
 */
export async function updateEventMatch(
  eventId: number,
  matchId: number,
  input: MatchUpdateInput,
): Promise<void> {
  const { kind, ...body } = input;
  await requestAuthedBackend({
    path: `/events/${eventId}/matches/${matchId}/${kind}`,
    method: "PUT",
    body,
  });
  /**
   * Output:
   * Side effects — Partido actualizado
   */
}

/**
 * Propósito: Quita la programación o el resultado de un partido.
 */
export async function clearEventMatch(
  eventId: number,
  matchId: number,
  kind: "schedule" | "result",
): Promise<void> {
  await requestAuthedBackend({
    path: `/events/${eventId}/matches/${matchId}/${kind}`,
    method: "DELETE",
  });
  /**
   * Output:
   * Side effects — Partido sin programación o sin resultado
   */
}

/**
 * Propósito: Inscribe el equipo del capitán autenticado.
 */
export async function registerTeam(
  eventId: number,
  input: { team_id: number; notes?: string },
): Promise<{ registrationId: number; status: string }> {
  const payload = await requestAuthedBackend<{
    registration: { registrationId: number; status: string };
  }>({ path: `/events/${eventId}/registrations`, method: "POST", body: input });
  /**
   * Output:
   * @returns object — Inscripción creada
   */
  return payload.registration;
}

/**
 * Propósito: Acción del organizador sobre una inscripción.
 */
export async function manageRegistration(
  eventId: number,
  registrationId: number,
  input: ManageRegistrationInput,
): Promise<void> {
  await requestAuthedBackend({
    path: `/events/${eventId}/registrations/${registrationId}`,
    method: "PATCH",
    body: input,
  });
  /**
   * Output:
   * Side effects — Inscripción actualizada
   */
}

/**
 * Propósito: El capitán retira su inscripción.
 */
export async function withdrawRegistration(registrationId: number): Promise<void> {
  await requestAuthedBackend({
    path: `/events/registrations/${registrationId}/withdraw`,
    method: "POST",
  });
  /**
   * Output:
   * Side effects — Inscripción retirada
   */
}

/**
 * Propósito: Contexto de pago de una inscripción propia.
 */
export async function getRegistrationCheckout(
  registrationId: number,
): Promise<RegistrationCheckoutContext> {
  const payload = await requestAuthedBackend<RegistrationCheckoutContext>({
    path: `/events/registrations/${registrationId}/checkout`,
  });
  /**
   * Output:
   * @returns RegistrationCheckoutContext — Valor, medios e intento
   */
  return {
    ...payload,
    methods: asArray(payload.methods),
    intent: payload.intent ? sanitizeIntent(payload.intent) : null,
  };
}

/**
 * Propósito: Abre el cobro de la inscripción.
 */
export async function createRegistrationCheckout(
  registrationId: number,
  methodId: number,
): Promise<PublicPaymentIntent> {
  const payload = await requestAuthedBackend<{ intent: PublicPaymentIntent }>({
    path: `/events/registrations/${registrationId}/checkout`,
    method: "POST",
    body: { method_id: methodId },
  });
  /**
   * Output:
   * @returns PublicPaymentIntent — URL o instrucciones
   */
  return sanitizeIntent(payload.intent);
}

/**
 * Propósito: Confirma un pago de prueba.
 */
export async function confirmRegistrationPaymentLocally(
  registrationId: number,
): Promise<PublicPaymentIntent> {
  const payload = await requestAuthedBackend<{ intent: PublicPaymentIntent }>({
    path: `/events/registrations/${registrationId}/checkout/confirm-local`,
    method: "POST",
  });
  /**
   * Output:
   * @returns PublicPaymentIntent — Intento liquidado
   */
  return sanitizeIntent(payload.intent);
}

/**
 * Propósito: Verifica la transacción al volver de Wompi.
 */
export async function verifyRegistrationPayment(
  registrationId: number,
  transactionId: string,
): Promise<PublicPaymentIntent> {
  const payload = await requestAuthedBackend<{ intent: PublicPaymentIntent }>({
    path: `/events/registrations/${registrationId}/checkout/verify`,
    method: "POST",
    body: { transaction_id: transactionId },
  });
  /**
   * Output:
   * @returns PublicPaymentIntent — Estado tras Wompi
   */
  return sanitizeIntent(payload.intent);
}

export interface EventCoverResult {
  coverImage: string;
  isSimulated: boolean;
}

/** Generar con IA puede tardar hasta ~1,5 min con un proveedor real. */
const COVER_GENERATION_TIMEOUT_MS = 100_000;
const COVER_UPLOAD_TIMEOUT_MS = 30_000;

/**
 * Propósito: Pide al backend una portada generada con los datos del evento.
 */
export async function generateEventCover(input: {
  establishmentId: number;
  name: string;
  sport: string;
  format: string;
}): Promise<EventCoverResult> {
  const payload = await requestAuthedBackend<{ cover_image: string; is_simulated?: boolean }>({
    path: "/events/cover/generate",
    method: "POST",
    body: {
      establishment_id: input.establishmentId,
      name: input.name,
      sport: input.sport,
      format: input.format,
    },
    timeoutMs: COVER_GENERATION_TIMEOUT_MS,
  });
  /**
   * Output:
   * @returns EventCoverResult — Ruta de la portada y si fue simulada
   */
  return { coverImage: payload.cover_image, isSimulated: payload.is_simulated === true };
}

/**
 * Propósito: Sube una portada al backend (multipart).
 */
export async function uploadEventCover(establishmentId: number, file: File): Promise<EventCoverResult> {
  const formData = new FormData();
  formData.set("establishment_id", String(establishmentId));
  formData.set("file", file, file.name);
  const payload = await requestAuthedBackend<{ cover_image: string }>({
    path: "/events/cover/upload",
    method: "POST",
    body: formData,
    timeoutMs: COVER_UPLOAD_TIMEOUT_MS,
  });
  /**
   * Output:
   * @returns EventCoverResult — Ruta de la portada subida
   */
  return { coverImage: payload.cover_image, isSimulated: false };
}
