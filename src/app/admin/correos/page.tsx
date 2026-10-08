import { requireSuperAdminAccess } from "@/application/admin-access";
import { listOutboxEmails } from "@/data/platform.repository";
import {
  EMAIL_STATUSES,
  EMAIL_STATUS_LABELS,
  EMAIL_TEMPLATE_LABELS,
  type EmailStatus,
} from "@/domain/platform";
import { PanelSection, StatusPill, type PillTone } from "@/features/admin/platform/platform-ui";
import { cn } from "@/shared/lib/cn";
import { formatDateTime } from "@/shared/lib/datetime";
import { Alert } from "@/shared/ui/alert";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin · Correos" };

const EMAILS_PATH = "/admin/correos";
const EMAILS_PAGE_SIZE = 50;

const EMAIL_STATUS_TONES: Record<EmailStatus, PillTone> = {
  queued: "warning",
  sent: "positive",
  failed: "danger",
  not_sent: "neutral",
};

/**
 * Propósito: Href con filtro de estado y cursor.
 */
function buildEmailsHref(status: EmailStatus | null, beforeEmailId?: number): string {
  const searchParams = new URLSearchParams();
  if (status) searchParams.set("estado", status);
  if (beforeEmailId) searchParams.set("antes", String(beforeEmailId));
  const query = searchParams.toString();
  /**
   * Output:
   * @returns string — Ruta con query
   */
  return query ? `${EMAILS_PATH}?${query}` : EMAILS_PATH;
}

/**
 * Propósito: Bandeja de salida de la plataforma (facturas, avisos, invitaciones, accesos).
 * Sin proveedor configurado los correos quedan aquí como "No enviado" para revisarlos.
 */
export default async function PlatformEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; antes?: string }>;
}) {
  const [, { estado, antes }] = await Promise.all([requireSuperAdminAccess(), searchParams]);
  const statusFilter = EMAIL_STATUSES.find((status) => status === estado) ?? null;
  const beforeEmailId = Number(antes);
  const outbox = await listOutboxEmails({
    status: statusFilter ?? undefined,
    beforeEmailId: Number.isInteger(beforeEmailId) && beforeEmailId > 0 ? beforeEmailId : undefined,
    limit: EMAILS_PAGE_SIZE,
  });
  const oldestEmail = outbox.emails.at(-1);

  /**
   * Output:
   * @returns JSX.Element — Bandeja de correos
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Plataforma"
        title="Correos"
        description="Todo lo que CanchaYa envía: facturas, recordatorios de vencimiento, aprobaciones, invitaciones y accesos."
      />
      {outbox.isProviderConfigured ? null : (
        <Alert tone="info">
          No hay proveedor de correo configurado (RESEND_API_KEY). Los correos se guardan aquí como
          &quot;No enviado&quot;; configúralo en el backend para que salgan solos.
        </Alert>
      )}
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {[null, ...EMAIL_STATUSES].map((status) => (
          <Link
            key={status ?? "all"}
            href={buildEmailsHref(status)}
            aria-current={status === statusFilter ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              status === statusFilter
                ? "border-lime/50 bg-lime/15 text-lime"
                : "border-white/10 text-mist hover:text-bone",
            )}
          >
            {status ? EMAIL_STATUS_LABELS[status] : "Todos"}
          </Link>
        ))}
      </nav>
      <PanelSection title="Bandeja de salida">
        {outbox.emails.length === 0 ? (
          <EmptyState title="Sin correos" description="Los correos de la plataforma aparecerán aquí." />
        ) : (
          <ol className="divide-y divide-white/5">
            {outbox.emails.map((email) => (
              <li key={email.emailId} className="space-y-2 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-bone">{email.subject}</p>
                    <p className="text-xs text-mist">
                      {EMAIL_TEMPLATE_LABELS[email.template] ?? email.template} · para {email.toEmail}
                    </p>
                  </div>
                  <div className="text-right text-xs text-mist">
                    <StatusPill tone={EMAIL_STATUS_TONES[email.status]}>
                      {EMAIL_STATUS_LABELS[email.status]}
                    </StatusPill>
                    <p className="mt-1">
                      {email.sentAt ? `Enviado ${formatDateTime(email.sentAt)}` : `Creado ${formatDateTime(email.createdAt)}`}
                      {email.attempts > 1 ? ` · ${email.attempts} intentos` : ""}
                    </p>
                  </div>
                </div>
                {email.lastError ? <p className="text-xs text-danger">Error: {email.lastError}</p> : null}
                {email.isSensitive ? (
                  <p className="text-xs text-mist">Contenido oculto: incluye un enlace de acceso personal.</p>
                ) : (
                  <details className="text-xs text-mist">
                    <summary className="cursor-pointer hover:text-bone">Ver contenido</summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-white/3 p-3 font-sans">
                      {email.textBody}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 flex justify-between text-sm">
          {antes ? (
            <Link href={buildEmailsHref(statusFilter)} className="text-lime hover:underline">
              Volver a lo más reciente
            </Link>
          ) : (
            <span />
          )}
          {outbox.emails.length === EMAILS_PAGE_SIZE && oldestEmail ? (
            <Link href={buildEmailsHref(statusFilter, oldestEmail.emailId)} className="text-lime hover:underline">
              Ver más antiguos
            </Link>
          ) : null}
        </div>
      </PanelSection>
    </div>
  );
}
