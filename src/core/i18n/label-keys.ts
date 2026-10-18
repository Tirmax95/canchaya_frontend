import type { MessageKey } from "@/core/i18n/messages";
import type { EstablishmentAmenity } from "@/domain/establishment";
import type {
  EventFormat,
  EventSport,
  EventStatus,
  RegistrationPaymentStatus,
  RegistrationStatus,
} from "@/domain/events";
import type { ErrorLogLevel, ErrorLogSource } from "@/domain/observability";
import type {
  EmailStatus,
  InvoiceStatusFilter,
  TenantStatus,
} from "@/domain/platform";
import type { InboxStatusFilter, InboxWindowFilter } from "@/domain/reservation-inbox";
import type { ReservationStatus } from "@/domain/reservation";
import type { CourtLiveStatus } from "@/domain/venue-occupancy";
import type { TranslateFn } from "@/core/i18n/translate";

export const RESERVATION_STATUS_KEYS: Record<ReservationStatus, MessageKey> = {
  pending: "labels.reservationPending",
  confirmed: "labels.reservationConfirmed",
  completed: "labels.reservationCompleted",
  cancelled: "labels.reservationCancelled",
};

export const INBOX_STATUS_KEYS: Record<InboxStatusFilter, MessageKey> = {
  actionable: "labels.inboxActionable",
  pending: "labels.inboxPending",
  confirmed: "labels.inboxConfirmed",
  completed: "labels.inboxCompleted",
  cancelled: "labels.inboxCancelled",
  all: "labels.inboxAll",
};

export const INBOX_WINDOW_KEYS: Record<InboxWindowFilter, MessageKey> = {
  upcoming: "labels.windowUpcoming",
  today: "labels.windowToday",
  past: "labels.windowPast",
  all: "labels.windowAll",
};

export const TENANT_STATUS_KEYS: Record<TenantStatus, MessageKey> = {
  pending: "labels.tenantPending",
  active: "labels.tenantActive",
  suspended: "labels.tenantSuspended",
};

export const EMAIL_STATUS_KEYS: Record<EmailStatus, MessageKey> = {
  queued: "labels.emailQueued",
  sent: "labels.emailSent",
  failed: "labels.emailFailed",
  not_sent: "labels.emailNotSent",
};

export const EMAIL_TEMPLATE_KEYS: Record<string, MessageKey> = {
  invoice_issued: "labels.templateInvoiceIssued",
  invoice_due_soon: "labels.templateInvoiceDueSoon",
  invoice_overdue: "labels.templateInvoiceOverdue",
  invoice_paid: "labels.templateInvoicePaid",
  tenant_approved: "labels.templateTenantApproved",
  tenant_suspended: "labels.templateTenantSuspended",
  password_reset: "labels.templatePasswordReset",
  staff_invitation: "labels.templateStaffInvitation",
  event_registration_confirmed: "labels.templateEventRegistrationConfirmed",
  event_registration_rejected: "labels.templateEventRegistrationRejected",
  event_cancelled: "labels.templateEventCancelled",
};

export const INVOICE_STATUS_KEYS: Record<InvoiceStatusFilter, MessageKey> = {
  issued: "labels.invoiceIssued",
  overdue: "labels.invoiceOverdue",
  paid: "labels.invoicePaid",
  void: "labels.invoiceVoid",
};

export const USER_ROLE_KEYS: Record<string, MessageKey> = {
  client: "labels.roleClient",
  establishment_owner: "labels.roleOwner",
  manager: "labels.roleManager",
  admin: "labels.roleAdmin",
};

export const ERROR_LOG_LEVEL_KEYS: Record<ErrorLogLevel, MessageKey> = {
  warn: "labels.logWarn",
  error: "labels.logError",
  fatal: "labels.logFatal",
};

export const ERROR_LOG_SOURCE_KEYS: Record<ErrorLogSource, MessageKey> = {
  backend: "labels.sourceBackend",
  frontend: "labels.sourceFrontend",
  bff: "labels.sourceBff",
};

export const COURT_STATUS_KEYS: Record<CourtLiveStatus, MessageKey> = {
  in_play: "labels.courtInPlay",
  awaiting_confirmation: "labels.courtAwaiting",
  starting_soon: "labels.courtStartingSoon",
  free: "labels.courtFree",
};

export const AUDIT_ACTION_KEYS: Record<string, MessageKey> = {
  "user.blocked": "labels.auditUserBlocked",
  "user.unblocked": "labels.auditUserUnblocked",
  "user.two_factor_reset": "labels.auditTwoFactorReset",
  "tenant.approved": "labels.auditTenantApproved",
  "tenant.impersonated": "labels.auditTenantImpersonated",
  "invoice.paid_online": "labels.auditInvoicePaidOnline",
  "tenant.suspended": "labels.auditTenantSuspended",
  "tenant.reactivated": "labels.auditTenantReactivated",
  "tenant.billing_updated": "labels.auditBillingUpdated",
  "tenant.online_payments_toggled": "labels.auditOnlinePaymentsToggled",
  "tenant.modules_updated": "labels.auditModulesUpdated",
  "invoice.issued": "labels.auditInvoiceIssued",
  "invoice.paid": "labels.auditInvoicePaid",
  "invoice.voided": "labels.auditInvoiceVoided",
  "payment_gateway.updated": "labels.auditGatewayUpdated",
  "payment_gateway.credentials_updated": "labels.auditGatewayCredentials",
  "payment_method.toggled": "labels.auditMethodToggled",
  "payment_intent.settled": "labels.auditIntentSettled",
  "user.role_assigned": "labels.auditRoleAssigned",
  "reservation.updated": "labels.auditReservationUpdated",
  "reservation.cancelled_by_staff": "labels.auditReservationCancelledByStaff",
  "booking_policy.updated": "labels.auditBookingPolicyUpdated",
};

const TENANT_MODULE_LABEL_KEYS = {
  dashboard: "admin.moduleDashboard",
  establishments: "admin.moduleVenues",
  fields: "admin.moduleCourts",
  reservations: "admin.moduleReservations",
  events: "admin.moduleEvents",
  news: "admin.moduleNews",
  messages: "admin.moduleMessages",
  matches: "admin.moduleMatches",
  challenges: "admin.moduleChallenges",
  teams: "admin.moduleTeams",
  billing: "admin.moduleBilling",
  staff: "admin.moduleStaff",
} as const;

/**
 * Propósito: Traduce una clave de mapa o devuelve el fallback (código crudo) si no hay entrada.
 */
export function translateMappedLabel(
  t: TranslateFn,
  keyMap: Record<string, MessageKey>,
  code: string,
): string {
  const messageKey = keyMap[code];
  /**
   * Output:
   * @returns string — Etiqueta localizada o el código original
   */
  return messageKey ? t(messageKey) : code;
}

/**
 * Propósito: Nombre de módulo del panel de sede en el idioma activo.
 */
export function translateTenantModuleLabel(
  t: TranslateFn,
  moduleId: keyof typeof TENANT_MODULE_LABEL_KEYS,
): string {
  /**
   * Output:
   * @returns string — Dashboard / Sedes / Canchas / Reservas / Eventos
   */
  return t(TENANT_MODULE_LABEL_KEYS[moduleId]);
}

export const AMENITY_LABEL_KEYS: Record<EstablishmentAmenity, MessageKey> = {
  parking: "venue.amenity_parking",
  locker_rooms: "venue.amenity_locker_rooms",
  showers: "venue.amenity_showers",
  cafeteria: "venue.amenity_cafeteria",
  wifi: "venue.amenity_wifi",
  night_lighting: "venue.amenity_night_lighting",
  covered: "venue.amenity_covered",
  equipment_rental: "venue.amenity_equipment_rental",
  first_aid: "venue.amenity_first_aid",
  accessible: "venue.amenity_accessible",
  store: "venue.amenity_store",
  grill_area: "venue.amenity_grill_area",
};

/** Índice = día de la semana (0 = domingo), igual que `Date#getDay`. */
export const WEEK_DAY_LABEL_KEYS: readonly MessageKey[] = [
  "venue.day0",
  "venue.day1",
  "venue.day2",
  "venue.day3",
  "venue.day4",
  "venue.day5",
  "venue.day6",
];

export const EVENT_STATUS_KEYS: Record<EventStatus, MessageKey> = {
  draft: "events.status_draft",
  registration_open: "events.status_registration_open",
  registration_closed: "events.status_registration_closed",
  in_progress: "events.status_in_progress",
  completed: "events.status_completed",
  cancelled: "events.status_cancelled",
};

export const EVENT_FORMAT_KEYS: Record<EventFormat, MessageKey> = {
  league: "events.format_league",
  knockout: "events.format_knockout",
  groups_knockout: "events.format_groups_knockout",
  open: "events.format_open",
};

export const EVENT_FORMAT_HINT_KEYS: Record<EventFormat, MessageKey> = {
  league: "events.formatHint_league",
  knockout: "events.formatHint_knockout",
  groups_knockout: "events.formatHint_groups_knockout",
  open: "events.formatHint_open",
};

export const EVENT_SPORT_KEYS: Record<EventSport, MessageKey> = {
  football_5: "events.sport_football_5",
  football_6: "events.sport_football_6",
  football_7: "events.sport_football_7",
  football_8: "events.sport_football_8",
  football_9: "events.sport_football_9",
  football_11: "events.sport_football_11",
  futsal: "events.sport_futsal",
  other: "events.sport_other",
};

export const EVENT_REGISTRATION_STATUS_KEYS: Record<RegistrationStatus, MessageKey> = {
  pending_payment: "events.reg_pending_payment",
  pending_approval: "events.reg_pending_approval",
  confirmed: "events.reg_confirmed",
  waitlisted: "events.reg_waitlisted",
  rejected: "events.reg_rejected",
  withdrawn: "events.reg_withdrawn",
};

export const EVENT_PAYMENT_STATUS_KEYS: Record<RegistrationPaymentStatus, MessageKey> = {
  not_required: "events.pay_not_required",
  pending: "events.pay_pending",
  paid: "events.pay_paid",
  refund_due: "events.pay_refund_due",
  refunded: "events.pay_refunded",
};

export const EVENT_NEXT_STEP_KEYS: Record<EventStatus, MessageKey> = {
  draft: "events.nextStepHint_draft",
  registration_open: "events.nextStepHint_registration_open",
  registration_closed: "events.nextStepHint_registration_closed",
  in_progress: "events.nextStepHint_in_progress",
  completed: "events.nextStepHint_completed",
  cancelled: "events.nextStepHint_cancelled",
};
