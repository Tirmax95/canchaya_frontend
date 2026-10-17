import { requestAuthedBackend } from "@/core/http/backend-client";
import { toSessionUser } from "@/data/auth.repository";
import type { SessionUser } from "@/domain/user";
import type { SystemErrorLogPage } from "@/domain/observability";
import type {
  AuditEntry,
  BookingPolicy,
  BookingPolicyRecord,
  EmailOutboxPage,
  EmailStatus,
  InvoiceGenerationResult,
  InvoiceStatusFilter,
  PlatformOverview,
  PlatformTenant,
  PlatformUserPage,
  ReservationReportRow,
  TenantInvoice,
  TenantPeriodReport,
  UserAccountStatus,
} from "@/domain/platform";

/**
 * Propósito: Arma un query string omitiendo vacíos (evita `?status=undefined`).
 */
function toQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  /**
   * Output:
   * @returns string — "?a=1&b=2" o ""
   */
  return query ? `?${query}` : "";
}

/**
 * Propósito: KPIs globales de la plataforma.
 */
export async function getPlatformOverview(): Promise<PlatformOverview> {
  const payload = await requestAuthedBackend<{ overview: PlatformOverview }>({ path: "/platform/overview" });
  /**
   * Output:
   * @returns PlatformOverview — Estadísticas globales
   */
  return payload.overview;
}

/**
 * Propósito: Tenants con plan, estado, actividad y deuda.
 */
export async function listPlatformTenants(): Promise<PlatformTenant[]> {
  const payload = await requestAuthedBackend<{ tenants: PlatformTenant[] }>({ path: "/platform/tenants" });
  /**
   * Output:
   * @returns PlatformTenant[] — Tenants ordenados por nombre
   */
  return payload.tenants.map((tenant) => ({
    ...tenant,
    onlinePaymentsEnabled: tenant.onlinePaymentsEnabled === true,
  }));
}

/**
 * Propósito: Aprueba, suspende o reactiva un tenant.
 */
export async function updateTenantStatus(
  organizationId: number,
  change: { action: "suspend"; reason: string } | { action: "reactivate" } | { action: "approve" },
): Promise<void> {
  await requestAuthedBackend<null>({
    path: `/platform/tenants/${organizationId}/${change.action}`,
    method: "PUT",
    body: change.action === "suspend" ? { reason: change.reason } : {},
  });
  /**
   * Output:
   * Side effects — Estado del tenant actualizado
   */
}

/**
 * Propósito: Abre una sesión de solo lectura como el dueño del tenant (30 minutos).
 */
export async function impersonateTenant(organizationId: number): Promise<SessionUser> {
  const payload = await requestAuthedBackend<Parameters<typeof toSessionUser>[0]>({
    path: `/platform/tenants/${organizationId}/impersonate`,
    method: "POST",
  });
  /**
   * Output:
   * @returns SessionUser — Sesión "ver como" del dueño
   */
  return { ...toSessionUser(payload), isReadOnly: true };
}

/**
 * Propósito: Plan de cobro de un tenant (mensualidad + comisión en bps).
 */
export async function updateTenantBilling(
  organizationId: number,
  settings: { monthlyFee: number; commissionBps: number; billingEmail?: string },
): Promise<void> {
  await requestAuthedBackend<null>({
    path: `/platform/tenants/${organizationId}/billing`,
    method: "PUT",
    body: {
      monthly_fee: settings.monthlyFee,
      commission_bps: settings.commissionBps,
      ...(settings.billingEmail ? { billing_email: settings.billingEmail } : {}),
    },
  });
  /**
   * Output:
   * Side effects — Plan persistido
   */
}

/**
 * Propósito: Enciende o apaga el cobro en línea de reservas de un tenant. Solo super admin.
 */
export async function updateTenantOnlinePayments(
  organizationId: number,
  isEnabled: boolean,
): Promise<void> {
  await requestAuthedBackend<null>({
    path: `/platform/tenants/${organizationId}/online-payments`,
    method: "PUT",
    body: { is_enabled: isEnabled },
  });
  /**
   * Output:
   * Side effects — Flag persistido
   */
}

/**
 * Propósito: Directorio de usuarios paginado y filtrable.
 */
export async function listPlatformUsers(filters: {
  search?: string;
  status?: UserAccountStatus;
  role?: string;
  page: number;
  pageSize: number;
}): Promise<PlatformUserPage> {
  /**
   * Output:
   * @returns PlatformUserPage — Página de usuarios
   */
  return requestAuthedBackend<PlatformUserPage>({
    path: `/platform/users${toQueryString({
      search: filters.search,
      status: filters.status,
      role: filters.role,
      page: filters.page,
      page_size: filters.pageSize,
    })}`,
  });
}

/**
 * Propósito: Bloquea, desbloquea o reinicia el 2FA de un usuario.
 */
export async function updateUserStatus(
  userId: number,
  change: { action: "block"; reason: string } | { action: "unblock" } | { action: "reset_2fa" },
): Promise<void> {
  const actionPath = change.action === "reset_2fa" ? "reset-2fa" : change.action;
  await requestAuthedBackend<null>({
    path: `/platform/users/${userId}/${actionPath}`,
    method: "PUT",
    body: change.action === "block" ? { reason: change.reason } : {},
  });
  /**
   * Output:
   * Side effects — Estado de la cuenta actualizado
   */
}

/**
 * Propósito: Facturas de todos los tenants con filtros opcionales.
 */
export async function listPlatformInvoices(filters: {
  status?: InvoiceStatusFilter;
  organizationId?: number;
  period?: string;
}): Promise<TenantInvoice[]> {
  const payload = await requestAuthedBackend<{ invoices: TenantInvoice[] }>({
    path: `/platform/invoices${toQueryString({
      status: filters.status,
      organization_id: filters.organizationId,
      period: filters.period,
    })}`,
  });
  /**
   * Output:
   * @returns TenantInvoice[] — Facturas filtradas
   */
  return payload.invoices;
}

/**
 * Propósito: Emite las facturas de un mes.
 */
export async function generateInvoices(input: {
  period: string;
  organizationIds?: number[];
  notes?: string;
}): Promise<InvoiceGenerationResult> {
  const payload = await requestAuthedBackend<{ result: InvoiceGenerationResult }>({
    path: "/platform/invoices/generate",
    method: "POST",
    body: {
      period: input.period,
      ...(input.organizationIds?.length ? { organization_ids: input.organizationIds } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    },
  });
  /**
   * Output:
   * @returns InvoiceGenerationResult — Emitidas y omitidas
   */
  return payload.result;
}

/**
 * Propósito: Marca pagada o anula una factura.
 */
export async function updateInvoice(
  invoiceId: number,
  change: { action: "pay"; paymentReference: string; paidAt?: string } | { action: "void"; reason: string },
): Promise<TenantInvoice> {
  const payload = await requestAuthedBackend<{ invoice: TenantInvoice }>({
    path: `/platform/invoices/${invoiceId}/${change.action}`,
    method: "PUT",
    body:
      change.action === "pay"
        ? { payment_reference: change.paymentReference, ...(change.paidAt ? { paid_at: change.paidAt } : {}) }
        : { reason: change.reason },
  });
  /**
   * Output:
   * @returns TenantInvoice — Factura con el estado nuevo
   */
  return payload.invoice;
}

/**
 * Propósito: Uso y monto facturable por tenant en un mes, más el recaudo de partidos.
 */
export async function getTenantPeriodReport(period: string): Promise<TenantPeriodReport> {
  /**
   * Output:
   * @returns TenantPeriodReport — Filas por tenant y recaudo de partidos
   */
  return requestAuthedBackend<TenantPeriodReport>({
    path: `/platform/reports/tenants${toQueryString({ period })}`,
  });
}

/**
 * Propósito: Reservas de toda la plataforma en un rango (máx. 92 días, 5000 filas).
 */
export async function getReservationsReport(
  fromIso: string,
  toIso: string,
): Promise<{ rows: ReservationReportRow[]; isTruncated: boolean }> {
  /**
   * Output:
   * @returns { rows, isTruncated } — Filas del reporte
   */
  return requestAuthedBackend<{ rows: ReservationReportRow[]; isTruncated: boolean }>({
    path: `/platform/reports/reservations${toQueryString({ from: fromIso, to: toIso })}`,
  });
}

/**
 * Propósito: Bitácora de acciones del super admin, paginada por cursor.
 */
export async function listAuditEntries(beforeAuditId?: number, limit = 50): Promise<AuditEntry[]> {
  const payload = await requestAuthedBackend<{ entries: AuditEntry[] }>({
    path: `/platform/audit${toQueryString({ limit, before: beforeAuditId })}`,
  });
  /**
   * Output:
   * @returns AuditEntry[] — Entradas más recientes primero
   */
  return payload.entries;
}

/**
 * Propósito: Bitácora de errores de todo el sistema, paginada por cursor.
 */
export async function listErrorLogs(filters: {
  level?: string;
  source?: string;
  fingerprint?: string;
  search?: string;
  beforeErrorId?: number;
  limit?: number;
}): Promise<SystemErrorLogPage> {
  /**
   * Output:
   * @returns SystemErrorLogPage — Resumen 24 h + entradas
   */
  return requestAuthedBackend<SystemErrorLogPage>({
    path: `/platform/error-logs${toQueryString({
      limit: filters.limit ?? 50,
      before: filters.beforeErrorId,
      level: filters.level,
      source: filters.source,
      fingerprint: filters.fingerprint,
      q: filters.search,
    })}`,
  });
}

/**
 * Propósito: Facturas de los tenants donde el usuario es dueño.
 */
export async function listMyInvoices(): Promise<TenantInvoice[]> {
  const payload = await requestAuthedBackend<{ invoices: TenantInvoice[] }>({
    path: "/organization/mine/invoices",
  });
  /**
   * Output:
   * @returns TenantInvoice[] — Facturas propias
   */
  return payload.invoices;
}

/**
 * Propósito: Bandeja de correos salientes, paginada por cursor.
 */
export async function listOutboxEmails(filters: {
  status?: EmailStatus;
  beforeEmailId?: number;
  limit?: number;
}): Promise<EmailOutboxPage> {
  /**
   * Output:
   * @returns EmailOutboxPage — Estado del proveedor y correos
   */
  return requestAuthedBackend<EmailOutboxPage>({
    path: `/platform/emails${toQueryString({
      status: filters.status,
      before: filters.beforeEmailId,
      limit: filters.limit ?? 50,
    })}`,
  });
}

/**
 * Propósito: Si el pago en línea de facturas está disponible.
 */
export async function getInvoicePaymentSettings(): Promise<{ onlinePaymentEnabled: boolean }> {
  const payload = await requestAuthedBackend<{ onlinePaymentEnabled?: unknown }>({
    path: "/organization/mine/invoices/payment-settings",
  });
  /**
   * Output:
   * @returns object — onlinePaymentEnabled
   */
  return { onlinePaymentEnabled: payload.onlinePaymentEnabled === true };
}

/**
 * Propósito: Crea el intento de pago en Wompi para una factura propia.
 */
export async function createInvoiceCheckout(invoiceId: number): Promise<{ checkoutUrl: string }> {
  const payload = await requestAuthedBackend<{ checkoutUrl?: unknown }>({
    path: `/organization/mine/invoices/${invoiceId}/checkout`,
    method: "POST",
  });
  const checkoutUrl = typeof payload.checkoutUrl === "string" ? payload.checkoutUrl : "";
  /**
   * Output:
   * @returns object — URL del checkout (solo checkout.wompi.co)
   */
  return { checkoutUrl: checkoutUrl.startsWith("https://checkout.wompi.co/") ? checkoutUrl : "" };
}

export type InvoicePaymentResult = "pending" | "approved" | "declined" | "error";

export interface InvoicePaymentVerification {
  status: InvoicePaymentResult;
  invoiceId: number | null;
}

const INVOICE_PAYMENT_RESULTS: InvoicePaymentResult[] = ["pending", "approved", "declined", "error"];

/**
 * Propósito: Verifica el resultado del pago al volver del checkout.
 */
export async function verifyInvoicePayment(transactionId: string): Promise<InvoicePaymentVerification> {
  const payload = await requestAuthedBackend<{ status?: unknown; invoiceId?: unknown }>({
    path: "/organization/mine/invoices/payments/verify",
    method: "POST",
    body: { transaction_id: transactionId },
  });
  /**
   * Output:
   * @returns InvoicePaymentVerification — Estado de la transacción
   */
  return {
    status: INVOICE_PAYMENT_RESULTS.find((result) => result === payload.status) ?? "error",
    invoiceId: typeof payload.invoiceId === "number" ? payload.invoiceId : null,
  };
}

interface BookingPolicyPayload {
  expiration_enabled: boolean;
  online_payment_window_minutes: number;
  online_payment_grace_minutes: number;
  manual_confirmation_window_minutes: number;
  manual_confirmation_cutoff_minutes: number;
  sweep_interval_minutes: number;
  max_open_pending_per_user: number;
  updated_at: string | null;
}

/**
 * Propósito: Respuesta snake_case del backend → política tipada.
 */
function toBookingPolicy(payload: BookingPolicyPayload): BookingPolicyRecord {
  /**
   * Output:
   * @returns BookingPolicyRecord — Política para la UI
   */
  return {
    expirationEnabled: payload.expiration_enabled === true,
    onlinePaymentWindowMinutes: Number(payload.online_payment_window_minutes),
    onlinePaymentGraceMinutes: Number(payload.online_payment_grace_minutes),
    manualConfirmationWindowMinutes: Number(payload.manual_confirmation_window_minutes),
    manualConfirmationCutoffMinutes: Number(payload.manual_confirmation_cutoff_minutes),
    sweepIntervalMinutes: Number(payload.sweep_interval_minutes),
    maxOpenPendingPerUser: Number(payload.max_open_pending_per_user),
    updatedAt: payload.updated_at,
  };
}

/**
 * Propósito: Reglas de reserva vigentes. Solo super admin.
 */
export async function getBookingPolicy(): Promise<BookingPolicyRecord> {
  const payload = await requestAuthedBackend<{ policy: BookingPolicyPayload }>({
    path: "/platform/booking-policy",
  });
  /**
   * Output:
   * @returns BookingPolicyRecord — Política vigente
   */
  return toBookingPolicy(payload.policy);
}

/**
 * Propósito: Reemplaza las reglas de reserva. Solo super admin.
 */
export async function updateBookingPolicy(policy: BookingPolicy): Promise<BookingPolicyRecord> {
  const payload = await requestAuthedBackend<{ policy: BookingPolicyPayload }>({
    path: "/platform/booking-policy",
    method: "PUT",
    body: {
      expiration_enabled: policy.expirationEnabled,
      online_payment_window_minutes: policy.onlinePaymentWindowMinutes,
      online_payment_grace_minutes: policy.onlinePaymentGraceMinutes,
      manual_confirmation_window_minutes: policy.manualConfirmationWindowMinutes,
      manual_confirmation_cutoff_minutes: policy.manualConfirmationCutoffMinutes,
      sweep_interval_minutes: policy.sweepIntervalMinutes,
      max_open_pending_per_user: policy.maxOpenPendingPerUser,
    },
  });
  /**
   * Output:
   * @returns BookingPolicyRecord — Política guardada
   */
  return toBookingPolicy(payload.policy);
}
