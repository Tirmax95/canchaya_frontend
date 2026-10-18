/**
 * Eventos deportivos (torneos, ligas, eventos abiertos). Las listas deben coincidir con
 * `src/domain/events/event.constants.ts` del backend, que es quien valida.
 */
import type { PublicPaymentIntent, PublicPaymentMethod } from "@/domain/payments";

export const EVENT_FORMATS = ["league", "knockout", "groups_knockout", "open"] as const;
export type EventFormat = (typeof EVENT_FORMATS)[number];

export const EVENT_SPORTS = [
  "football_5",
  "football_6",
  "football_7",
  "football_8",
  "football_9",
  "football_11",
  "futsal",
  "other",
] as const;
export type EventSport = (typeof EVENT_SPORTS)[number];

export const EVENT_STATUSES = [
  "draft",
  "registration_open",
  "registration_closed",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const REGISTRATION_STATUSES = [
  "pending_payment",
  "pending_approval",
  "confirmed",
  "waitlisted",
  "rejected",
  "withdrawn",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const ACTIVE_REGISTRATION_STATUSES: readonly RegistrationStatus[] = [
  "pending_payment",
  "pending_approval",
  "confirmed",
  "waitlisted",
];

export const REGISTRATION_PAYMENT_STATUSES = [
  "not_required",
  "pending",
  "paid",
  "refund_due",
  "refunded",
] as const;
export type RegistrationPaymentStatus = (typeof REGISTRATION_PAYMENT_STATUSES)[number];

export type MatchStage = "league" | "group" | "knockout";
export type EventMatchStatus = "pending" | "scheduled" | "completed" | "walkover" | "cancelled";

export interface EventSettings {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  doubleRound: boolean;
  groupCount: number;
  qualifiersPerGroup: number;
  thirdPlaceMatch: boolean;
  matchDurationMinutes: number;
}

export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  doubleRound: false,
  groupCount: 2,
  qualifiersPerGroup: 2,
  thirdPlaceMatch: false,
  matchDurationMinutes: 60,
};

export const EVENT_LIMITS = {
  minTeams: 2,
  maxTeams: 64,
  maxPlayersPerTeam: 40,
  maxEntryFeePesos: 50_000_000,
  maxGroups: 16,
  minMatchMinutes: 20,
  maxMatchMinutes: 240,
  maxScore: 99,
} as const;

export interface EventSummary {
  eventId: number;
  organizationId: number;
  establishmentId: number;
  name: string;
  description: string;
  sport: EventSport;
  format: EventFormat;
  status: EventStatus;
  startsOn: string;
  endsOn: string | null;
  registrationClosesAt: string | null;
  minTeams: number;
  maxTeams: number;
  minPlayersPerTeam: number;
  maxPlayersPerTeam: number | null;
  entryFeeCents: number;
  currency: string;
  requiresApproval: boolean;
  settings: EventSettings;
  prizes: string;
  rules: string;
  coverImage: string;
  cancelledReason: string | null;
  fixtureGeneratedAt: string | null;
  publishedAt: string | null;
  establishmentName: string;
  establishmentCity: string;
  organizationName: string;
  seatsTaken: number;
  confirmedTeams: number;
  waitlistedTeams: number;
}

/**
 * Equipo inscrito. El público solo recibe equipo, estado, siembra y grupo: pago, valor y
 * notas llegan únicamente al organizador y, en las inscripciones propias, al capitán.
 */
export interface EventTeam {
  registrationId: number;
  teamId: number;
  teamName: string;
  status: RegistrationStatus;
  seed: number | null;
  groupLabel: string | null;
  createdAt: string;
  paymentStatus?: RegistrationPaymentStatus;
  amountCents?: number;
  paymentDueAt?: string | null;
  notes?: string;
  decisionReason?: string | null;
  contact?: { fullName: string; email: string; phone: string };
}

/** Inscripción propia o vista del organizador: siempre trae el estado del pago. */
export type EventTeamWithPayment = EventTeam &
  Required<Pick<EventTeam, "paymentStatus" | "amountCents">>;

export interface EventMatch {
  matchId: number;
  eventId: number;
  stage: MatchStage;
  round: number;
  groupLabel: string | null;
  bracketPosition: number | null;
  isThirdPlace: boolean;
  homeRegistrationId: number | null;
  awayRegistrationId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  winnerRegistrationId: number | null;
  status: EventMatchStatus;
  nextMatchId: number | null;
  fieldId: number | null;
  startsAt: string | null;
  endsAt: string | null;
  notes: string;
  homeTeamName: string | null;
  awayTeamName: string | null;
  fieldName: string | null;
}

export interface StandingRow {
  registrationId: number;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: Array<"W" | "D" | "L">;
}

export interface StandingsTable {
  groupLabel: string | null;
  rows: StandingRow[];
}

export interface EventDetail {
  event: EventSummary & { isRegistrationOpen: boolean };
  venue: {
    establishmentId: number;
    name: string;
    address: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
    imageEstablishment: string;
  } | null;
  teams: EventTeam[];
  matches: EventMatch[];
  standings: StandingsTable[];
  champion: { registrationId: number; teamName: string } | null;
  viewer: { canManage: boolean; myRegistrations: EventTeamWithPayment[] };
  onlinePaymentsEnabled: boolean;
  fields?: Array<{ fieldId: number; name: string; establishmentName: string }>;
}

export interface MyEventRegistration {
  registration: EventTeamWithPayment & { eventId: number };
  event: EventSummary;
}

export interface RegistrationCheckoutContext {
  registration: EventTeamWithPayment & { eventId: number };
  event: EventSummary;
  amountPesos: number;
  onlinePaymentsEnabled: boolean;
  methods: PublicPaymentMethod[];
  intent: PublicPaymentIntent | null;
}

/**
 * Propósito: True si el formato genera partidos.
 */
export function formatHasMatches(format: EventFormat): boolean {
  /**
   * Output:
   * @returns boolean — False solo para eventos abiertos
   */
  return format !== "open";
}

/**
 * Propósito: True si el formato tiene llaves de eliminación.
 */
export function formatHasBracket(format: EventFormat): boolean {
  /**
   * Output:
   * @returns boolean — Eliminatoria o grupos + eliminatoria
   */
  return format === "knockout" || format === "groups_knockout";
}

/**
 * Propósito: Cupos libres (nunca negativos).
 */
export function getFreeSeats(event: Pick<EventSummary, "maxTeams" | "seatsTaken">): number {
  /**
   * Output:
   * @returns number — Cupos disponibles
   */
  return Math.max(event.maxTeams - event.seatsTaken, 0);
}

/**
 * Propósito: Nombre de una ronda de eliminatoria según cuántas rondas faltan para la final.
 * Devuelve una clave de i18n estable ("final", "semifinal", "quarterfinal", "roundOf16") o
 * null si es una ronda temprana que se nombra por número.
 */
export function getKnockoutRoundKey(
  round: number,
  totalRounds: number,
): "final" | "semifinal" | "quarterfinal" | "roundOf16" | null {
  const roundsToFinal = totalRounds - round;
  /**
   * Output:
   * @returns string | null — Clave de la ronda
   */
  return roundsToFinal === 0
    ? "final"
    : roundsToFinal === 1
      ? "semifinal"
      : roundsToFinal === 2
        ? "quarterfinal"
        : roundsToFinal === 3
          ? "roundOf16"
          : null;
}

/**
 * Propósito: Agrupa partidos por fase, grupo y fecha en el orden de visualización.
 */
export function groupMatchesByRound(matches: EventMatch[]): Array<{
  key: string;
  stage: MatchStage;
  groupLabel: string | null;
  round: number;
  matches: EventMatch[];
}> {
  const stageOrder: Record<MatchStage, number> = { league: 0, group: 1, knockout: 2 };
  const groups = new Map<string, { stage: MatchStage; groupLabel: string | null; round: number; matches: EventMatch[] }>();
  for (const match of matches) {
    const key = `${match.stage}|${match.stage === "group" ? (match.groupLabel ?? "") : ""}|${match.round}`;
    const bucket = groups.get(key) ?? {
      stage: match.stage,
      groupLabel: match.stage === "group" ? match.groupLabel : null,
      round: match.round,
      matches: [],
    };
    bucket.matches.push(match);
    groups.set(key, bucket);
  }
  /**
   * Output:
   * @returns Array — Bloques ordenados (fase, grupo, ronda)
   */
  return [...groups.entries()]
    .map(([key, bucket]) => ({ key, ...bucket }))
    .sort(
      (left, right) =>
        stageOrder[left.stage] - stageOrder[right.stage] ||
        (left.groupLabel ?? "").localeCompare(right.groupLabel ?? "") ||
        left.round - right.round,
    );
}

/**
 * Propósito: Rondas de la llave (sin tercer puesto) en orden, para dibujar el cuadro.
 */
export function buildBracketColumns(matches: EventMatch[]): EventMatch[][] {
  const knockout = matches.filter((match) => match.stage === "knockout" && !match.isThirdPlace);
  const rounds = [...new Set(knockout.map((match) => match.round))].sort((left, right) => left - right);
  /**
   * Output:
   * @returns EventMatch[][] — Una columna por ronda, ordenada por posición
   */
  return rounds.map((round) =>
    knockout
      .filter((match) => match.round === round)
      .sort((left, right) => (left.bracketPosition ?? 0) - (right.bracketPosition ?? 0)),
  );
}

/**
 * Propósito: True si el partido ya tiene resultado que cuenta.
 */
export function isMatchPlayed(match: Pick<EventMatch, "status">): boolean {
  /**
   * Output:
   * @returns boolean — Jugado o W.O.
   */
  return match.status === "completed" || match.status === "walkover";
}

/**
 * Propósito: Marcador legible con penales si los hubo ("2 - 2 (4-3 pen.)").
 */
export function formatScore(match: EventMatch): string | null {
  if (!isMatchPlayed(match) || match.homeScore === null || match.awayScore === null) {
    /**
     * Output:
     * @returns null — Sin resultado
     */
    return null;
  }
  const penalties =
    match.homePenalties !== null && match.awayPenalties !== null
      ? ` (${match.homePenalties}-${match.awayPenalties} pen.)`
      : "";
  /**
   * Output:
   * @returns string — Marcador
   */
  return `${match.homeScore} - ${match.awayScore}${penalties}`;
}

/**
 * Propósito: Etapa siguiente sugerida para el organizador según el estado del evento.
 */
export function getNextLifecycleAction(
  status: EventStatus,
): "publish" | "close_registration" | "start" | "complete" | null {
  /**
   * Output:
   * @returns string | null — Acción principal del panel
   */
  return status === "draft"
    ? "publish"
    : status === "registration_open"
      ? "close_registration"
      : status === "registration_closed"
        ? "start"
        : status === "in_progress"
          ? "complete"
          : null;
}

/** Portada guardada por el backend y servida por este mismo origen (`/uploads/...`). */
const UPLOADED_COVER_PATTERN =
  /^\/uploads\/events\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|svg)$/;

/**
 * Propósito: True si la ruta es una portada subida o generada en CanchaYa.
 */
export function isUploadedCoverPath(value: string): boolean {
  /**
   * Output:
   * @returns boolean — Coincide con `/uploads/events/<uuid>.<ext>`
   */
  return UPLOADED_COVER_PATTERN.test(value);
}

export const MAX_COVER_UPLOAD_BYTES = 5 * 1024 * 1024;
export const COVER_UPLOAD_TYPES: readonly string[] = ["image/png", "image/jpeg", "image/webp"];
