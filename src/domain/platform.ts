/**
 * Contratos del panel del dueño de la plataforma (super admin). Reflejan las respuestas de
 * `/platform/*` del backend, que es quien valida y calcula todo.
 */

export type UserAccountStatus = "active" | "blocked";
export type TenantStatus = "pending" | "active" | "suspended";
export type InvoiceStatus = "issued" | "paid" | "void";
export type InvoiceStatusFilter = InvoiceStatus | "overdue";

export const INVOICE_STATUS_FILTERS: InvoiceStatusFilter[] = ["issued", "overdue", "paid", "void"];
export const USER_ROLE_FILTERS = ["client", "establishment_owner", "manager", "admin"] as const;
export type UserRoleFilter = (typeof USER_ROLE_FILTERS)[number];

/** 10.000 puntos básicos = 100 %. */
export const MAX_COMMISSION_BPS = 10_000;
export const MAX_MONTHLY_FEE = 100_000_000;
export const STATUS_REASON_MAX_LENGTH = 280;
export const MAX_REPORT_RANGE_DAYS = 92;

export const PLATFORM_PAYMENT_INSTRUCTIONS =
  "Paga por transferencia o Nequi y envía el comprobante al equipo de CanchaYa indicando el número de factura. El super admin la marcará como pagada.";

export const TENANT_STATUSES: TenantStatus[] = ["pending", "active", "suspended"];

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  pending: "Pendiente",
  active: "Activo",
  suspended: "Suspendido",
};

/**
 * Dinero de partidos abiertos: lo cobra la plataforma directamente (no se factura al tenant).
 */
export interface PickupRevenue {
  paidSlots: number;
  collected: number;
  organizerShare: number;
  platformFees: number;
}

export interface PlatformOverview {
  generatedAt: string;
  users: { total: number; blocked: number; newLast30Days: number; owners: number; admins: number };
  tenants: { total: number; pending: number; suspended: number };
  inventory: { establishments: number; fields: number };
  reservationsLast30Days: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    bookedHours: number;
    grossBookings: number;
  };
  pickupMatchesLast30Days: number;
  pickupRevenueLast30Days: PickupRevenue;
  billing: {
    outstandingAmount: number;
    outstandingCount: number;
    overdueAmount: number;
    overdueCount: number;
    collectedThisMonth: number;
  };
  dailySeries: Array<{ day: string; reservations: number; grossBookings: number }>;
  topTenants: Array<{ organizationId: number; name: string; reservations: number; grossBookings: number }>;
}

export interface PlatformTenant {
  organizationId: number;
  name: string;
  slug: string;
  status: TenantStatus;
  approvedAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  enabledModules: string[];
  monthlyFee: number;
  commissionBps: number;
  billingEmail: string | null;
  createdAt: string;
  ownerEmail: string | null;
  ownerName: string | null;
  establishmentCount: number;
  fieldCount: number;
  reservationsLast30Days: number;
  grossLast30Days: number;
  outstandingAmount: number;
  overdueCount: number;
  onlinePaymentsEnabled: boolean;
}

export interface PlatformUser {
  userId: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  status: UserAccountStatus;
  blockedAt: string | null;
  blockedReason: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  roles: string[];
  organizations: Array<{ organizationId: number; name: string; role: string }>;
  reservationCount: number;
}

export interface PlatformUserPage {
  users: PlatformUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TenantInvoice {
  invoiceId: number;
  invoiceNumber: string;
  organizationId: number;
  organizationName: string;
  period: string;
  monthlyFee: number;
  commissionBps: number;
  reservationCount: number;
  bookedHours: number;
  grossBookings: number;
  commissionAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  isOverdue: boolean;
  dueDate: string;
  issuedAt: string;
  paidAt: string | null;
  paymentReference: string | null;
  voidReason: string | null;
  notes: string | null;
}

export interface InvoiceGenerationResult {
  period: string;
  created: TenantInvoice[];
  skippedAlreadyInvoiced: number;
  skippedNothingToBill: number;
}

export interface TenantPeriodReportRow {
  organizationId: number;
  name: string;
  status: TenantStatus;
  monthlyFee: number;
  commissionBps: number;
  reservationCount: number;
  bookedHours: number;
  grossBookings: number;
  invoiceId: number | null;
  invoiceStatus: InvoiceStatus | null;
  commissionAmount: number;
  totalAmount: number;
}

export interface ReservationReportRow {
  reservationId: number;
  startTime: string;
  endTime: string;
  status: string;
  bookedHours: number;
  amount: number;
  fieldNumber: string;
  establishmentName: string;
  organizationName: string | null;
  playerEmail: string;
}

export interface TenantPeriodReport {
  period: string;
  rows: TenantPeriodReportRow[];
  pickupRevenue: PickupRevenue;
}

export type EmailStatus = "queued" | "sent" | "failed" | "not_sent";
export const EMAIL_STATUSES: EmailStatus[] = ["queued", "sent", "failed", "not_sent"];

export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  queued: "En cola",
  sent: "Enviado",
  failed: "Falló",
  not_sent: "Sin enviar",
};

export const EMAIL_TEMPLATE_LABELS: Record<string, string> = {
  invoice_issued: "Factura emitida",
  invoice_due_soon: "Factura por vencer",
  invoice_overdue: "Factura vencida",
  invoice_paid: "Pago confirmado",
  tenant_approved: "Tenant aprobado",
  tenant_suspended: "Tenant suspendido",
  password_reset: "Restablecer contraseña",
  staff_invitation: "Invitación al equipo",
};

export interface OutboxEmail {
  emailId: number;
  template: string;
  toEmail: string;
  subject: string;
  /** Null en correos sensibles (enlaces de acceso): nunca se exponen. */
  textBody: string | null;
  isSensitive: boolean;
  status: EmailStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface EmailOutboxPage {
  isProviderConfigured: boolean;
  emails: OutboxEmail[];
}

export interface AuditEntry {
  auditId: number;
  actorUserId: number | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: number;
  details: Record<string, unknown>;
  createdAt: string;
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatusFilter, string> = {
  issued: "Por pagar",
  overdue: "Vencida",
  paid: "Pagada",
  void: "Anulada",
};

export const USER_ROLE_LABELS: Record<string, string> = {
  client: "Jugador",
  establishment_owner: "Dueño",
  manager: "Manager",
  admin: "Super admin",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "user.blocked": "Bloqueó un usuario",
  "user.unblocked": "Desbloqueó un usuario",
  "user.two_factor_reset": "Reinició el 2FA de un usuario",
  "tenant.approved": "Aprobó un tenant",
  "tenant.impersonated": "Vio el panel como un tenant",
  "invoice.paid_online": "Pago en línea (Wompi)",
  "tenant.suspended": "Suspendió un tenant",
  "tenant.reactivated": "Reactivó un tenant",
  "tenant.billing_updated": "Cambió el plan de cobro",
  "tenant.online_payments_toggled": "Encendió o apagó el cobro en línea de un tenant",
  "tenant.modules_updated": "Cambió módulos",
  "invoice.issued": "Emitió una factura",
  "invoice.paid": "Registró un pago",
  "invoice.voided": "Anuló una factura",
  "payment_gateway.updated": "Actualizó una pasarela de pago",
  "payment_gateway.credentials_updated": "Actualizó llaves de una pasarela",
  "payment_method.toggled": "Encendió o apagó un medio de pago",
  "payment_intent.settled": "Confirmó un pago manual",
  "user.role_assigned": "Asignó un rol",
  "reservation.updated": "Modificó una reserva",
  "reservation.cancelled_by_staff": "Canceló una reserva desde el panel",
};

/**
 * Propósito: Convierte puntos básicos a porcentaje legible (250 → "2,5 %").
 */
export function formatCommissionBps(commissionBps: number, locale = "es-CO"): string {
  /**
   * Output:
   * @returns string — Porcentaje con hasta 2 decimales
   */
  return `${(commissionBps / 100).toLocaleString(locale, { maximumFractionDigits: 2 })} %`;
}

/**
 * Propósito: Estado visible de una factura (las emitidas vencidas se muestran como vencidas).
 */
export function resolveInvoiceDisplayStatus(invoice: Pick<TenantInvoice, "status" | "isOverdue">): InvoiceStatusFilter {
  /**
   * Output:
   * @returns InvoiceStatusFilter — Estado para badge
   */
  return invoice.status === "issued" && invoice.isOverdue ? "overdue" : invoice.status;
}

/**
 * Propósito: Periodo YYYY-MM en hora Bogotá desplazado `monthOffset` meses respecto a `reference`.
 */
export function toBillingPeriod(reference: Date, monthOffset = 0): string {
  const bogotaNow = new Date(reference.getTime() - 5 * 60 * 60 * 1000);
  const shifted = new Date(Date.UTC(bogotaNow.getUTCFullYear(), bogotaNow.getUTCMonth() + monthOffset, 1));
  /**
   * Output:
   * @returns string — Periodo YYYY-MM
   */
  return shifted.toISOString().slice(0, 7);
}

/**
 * Propósito: True si el texto es un periodo YYYY-MM válido.
 */
export function isBillingPeriod(value: unknown): value is string {
  /**
   * Output:
   * @returns boolean — Formato válido
   */
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/**
 * Propósito: Nombre legible de un periodo ("octubre de 2026").
 */
export function formatBillingPeriod(period: string, locale = "es-CO"): string {
  const [year, month] = period.split("-").map(Number);
  /**
   * Output:
   * @returns string — Mes y año localizados
   */
  return new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
