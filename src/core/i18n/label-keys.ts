import type { MessageKey } from "@/core/i18n/messages";
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
};

const TENANT_MODULE_LABEL_KEYS = {
  dashboard: "admin.moduleDashboard",
  establishments: "admin.moduleVenues",
  fields: "admin.moduleCourts",
  reservations: "admin.moduleReservations",
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
   * @returns string — Dashboard / Sedes / Canchas / Reservas
   */
  return t(TENANT_MODULE_LABEL_KEYS[moduleId]);
}
