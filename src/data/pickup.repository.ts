import { requestAuthedBackend, requestBackend } from "@/core/http/backend-client";
import type {
  GamificationSummary,
  PickupCheckout,
  PickupInvite,
  PickupMatch,
  PickupNotification,
  PickupPayment,
  PickupReto,
  PickupTeam,
} from "@/domain/pickup";
import { MATCH_STATUSES } from "@/domain/pickup";
import type { CreatePickupMatchInput, CreateRetoInput } from "@/domain/schemas";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Propósito: Normaliza un partido del API sin confiar en el shape crudo.
 */
export function toPickupMatch(raw: unknown): PickupMatch {
  const row = asRecord(raw);
  const status = MATCH_STATUSES.includes(row.status as PickupMatch["status"])
    ? (row.status as PickupMatch["status"])
    : "draft";
  /**
   * Output:
   * @returns PickupMatch — Partido sanitizado
   */
  return {
    id: asNumber(row.id),
    organizerId: asNumber(row.organizerId),
    sport: String(row.sport ?? "futbol"),
    venueText: String(row.venueText ?? ""),
    lat: asNumber(row.lat),
    lng: asNumber(row.lng),
    startsAt: String(row.startsAt ?? ""),
    totalSlots: asNumber(row.totalSlots),
    slotsTaken: asNumber(row.slotsTaken),
    slotsLeft: asNumber(row.slotsLeft),
    pricePerSlot: asNumber(row.pricePerSlot),
    skillLevel: String(row.skillLevel ?? "amateur"),
    status,
    createdAt: String(row.createdAt ?? ""),
    distanceMeters:
      row.distanceMeters === undefined
        ? undefined
        : asNumber(row.distanceMeters),
    urgent: Boolean(row.urgent),
  };
}

async function authed<T>(
  path: string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?: unknown,
): Promise<T> {
  /**
   * Output:
   * @returns T — Respuesta del backend autenticada
   */
  return requestAuthedBackend<T>({ path, method, body });
}

export async function listPickupFeed(lat: number, lng: number) {
  const payload = await requestBackend<unknown>({
    path: `/pickup/matches/feed?lat=${lat}&lng=${lng}&radiusKm=15`,
  });
  const rows = Array.isArray(payload) ? payload : [];
  /**
   * Output:
   * @returns PickupMatch[]
   */
  return rows.map((row) => toPickupMatch(row));
}

export async function listMyMatches() {
  const payload = await authed<unknown>("/pickup/matches/mine");
  const rows = Array.isArray(payload) ? payload : [];
  return rows.map((row) => toPickupMatch(row));
}

export async function getPickupMatch(matchId: number) {
  return toPickupMatch(
    await requestBackend<unknown>({ path: `/pickup/matches/${matchId}` }),
  );
}

export async function createPickupMatch(input: CreatePickupMatchInput) {
  return toPickupMatch(
    await authed<unknown>("/pickup/matches", "POST", input),
  );
}

export async function publishPickupMatch(matchId: number) {
  return toPickupMatch(
    await authed<unknown>(`/pickup/matches/${matchId}/publish`, "POST"),
  );
}

export async function cancelPickupMatch(matchId: number) {
  return toPickupMatch(
    await authed<unknown>(`/pickup/matches/${matchId}/cancel`, "POST"),
  );
}

export async function confirmPickupMatch(matchId: number) {
  return toPickupMatch(
    await authed<unknown>(`/pickup/matches/${matchId}/confirm`, "POST"),
  );
}

export async function startPickupMatch(matchId: number) {
  return toPickupMatch(
    await authed<unknown>(`/pickup/matches/${matchId}/start`, "POST"),
  );
}

export async function holdPickupSlot(matchId: number) {
  /**
   * Output:
   * @returns PickupCheckout
   */
  return authed<PickupCheckout>("/pickup/slots/hold", "POST", { matchId });
}

export async function checkoutPickup(matchId: number) {
  return authed<PickupPayment>("/pickup/payments/checkout", "POST", {
    matchId,
  });
}

export async function approveSandboxPayment(paymentId: number) {
  return authed<PickupPayment>(
    `/pickup/payments/${paymentId}/sandbox-approve`,
    "POST",
  );
}

/**
 * Propósito: Pagos del actor. El backend filtra por sesión.
 */
export async function listMyPayments() {
  const payload = await authed<unknown>("/pickup/payments/me");
  /**
   * Output:
   * @returns PickupPayment[] — Historial propio
   */
  return (Array.isArray(payload) ? payload : []) as PickupPayment[];
}

/**
 * Propósito: Checkout pending del partido. Una query filtrada por sesión.
 */
export async function getPendingPayment(matchId: number) {
  const payload = await authed<unknown>(
    `/pickup/payments/pending/${matchId}`,
  );
  /**
   * Output:
   * @returns PickupPayment | null — Pending propio
   */
  return payload && typeof payload === "object"
    ? (payload as PickupPayment)
    : null;
}

export async function listMyTeams() {
  const payload = await authed<unknown>("/pickup/teams/me");
  return (Array.isArray(payload) ? payload : []) as PickupTeam[];
}

export async function listTeamInvites() {
  const payload = await authed<unknown>("/pickup/teams/invites/me");
  return (Array.isArray(payload) ? payload : []) as PickupInvite[];
}

export async function createTeam(name: string) {
  return authed<PickupTeam>("/pickup/teams", "POST", { name });
}

export async function searchTeams(query: string) {
  const payload = await authed<unknown>(
    `/pickup/teams/search?q=${encodeURIComponent(query)}`,
  );
  return (Array.isArray(payload) ? payload : []) as PickupTeam[];
}

export async function searchUserByPhone(phone: string) {
  return authed<{ id: number; fullName?: string; phone?: string } | null>(
    `/pickup/users/search?phone=${encodeURIComponent(phone)}`,
  );
}

export async function inviteToTeam(teamId: number, userId: number) {
  return authed<PickupInvite>(`/pickup/teams/${teamId}/invite`, "POST", {
    userId,
  });
}

export async function respondInvite(inviteId: number, accept: boolean) {
  const action = accept ? "accept" : "decline";
  return authed<PickupInvite>(
    `/pickup/teams/invites/${inviteId}/${action}`,
    "POST",
  );
}

export async function listMyRetos() {
  const payload = await authed<unknown>("/pickup/retos/me");
  return (Array.isArray(payload) ? payload : []) as PickupReto[];
}

export async function createReto(input: CreateRetoInput) {
  return authed<PickupReto>("/pickup/retos", "POST", input);
}

export async function respondReto(retoId: number, accept: boolean) {
  const action = accept ? "accept" : "decline";
  return authed<PickupReto>(`/pickup/retos/${retoId}/${action}`, "POST");
}

export async function getMyGamification() {
  return authed<GamificationSummary>("/pickup/gamification/me");
}

export async function getMyNotifications() {
  return authed<{
    unreadCount: number;
    notifications: PickupNotification[];
  }>("/pickup/notifications/me");
}

export async function markAllNotificationsRead() {
  return authed<{ ok: boolean }>("/pickup/notifications/read-all", "POST");
}

export async function getMyLedger() {
  return authed<{
    balance: number;
    entries: Array<{
      id: number;
      type: string;
      amount: number;
      createdAt: string;
    }>;
  }>("/pickup/ledger/me");
}
