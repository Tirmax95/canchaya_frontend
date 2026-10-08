import { requireSuperAdminAccess } from "@/application/admin-access";
import { listAuditEntries } from "@/data/platform.repository";
import { AUDIT_ACTION_LABELS, type AuditEntry } from "@/domain/platform";
import { PanelSection } from "@/features/admin/platform/platform-ui";
import { formatDateTime } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin · Auditoría" };

const AUDIT_PAGE_SIZE = 50;
const TARGET_LABELS: Record<string, string> = {
  user: "Usuario",
  organization: "Tenant",
  invoice: "Factura",
};

/**
 * Propósito: Resume los detalles relevantes de una entrada para lectura humana.
 */
function describeAuditDetails(entry: AuditEntry): string {
  const { details } = entry;
  const parts: string[] = [];
  if (typeof details.reason === "string") parts.push(`Motivo: ${details.reason}`);
  if (typeof details.paymentReference === "string") parts.push(`Ref.: ${details.paymentReference}`);
  if (typeof details.totalAmount === "number") parts.push(`Total: ${formatMoney(details.totalAmount)}`);
  if (typeof details.period === "string") parts.push(`Periodo ${details.period}`);
  if (typeof details.monthlyFee === "number") parts.push(`Mensualidad ${formatMoney(details.monthlyFee)}`);
  if (typeof details.commissionBps === "number") parts.push(`Comisión ${details.commissionBps / 100} %`);
  if (Array.isArray(details.enabledModules)) parts.push(`Módulos: ${details.enabledModules.join(", ") || "ninguno"}`);
  /**
   * Output:
   * @returns string — Detalle legible
   */
  return parts.join(" · ");
}

/**
 * Propósito: Bitácora de acciones del super admin, más recientes primero, paginada por cursor.
 */
export default async function PlatformAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ antes?: string }>;
}) {
  const [, { antes }] = await Promise.all([requireSuperAdminAccess(), searchParams]);
  const beforeAuditId = Number(antes);
  const entries = await listAuditEntries(
    Number.isInteger(beforeAuditId) && beforeAuditId > 0 ? beforeAuditId : undefined,
    AUDIT_PAGE_SIZE,
  );
  const oldestEntry = entries.at(-1);

  /**
   * Output:
   * @returns JSX.Element — Línea de tiempo de auditoría
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Plataforma"
        title="Auditoría"
        description="Registro de bloqueos, suspensiones, cambios de plan o módulos y movimientos de facturas."
      />
      <PanelSection title="Acciones recientes">
        {entries.length === 0 ? (
          <EmptyState title="Sin registros" description="Las acciones del super admin aparecerán aquí." />
        ) : (
          <ol className="divide-y divide-white/5">
            {entries.map((entry) => (
              <li key={entry.auditId} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  <p className="text-bone">
                    {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}{" "}
                    <span className="text-mist">
                      · {TARGET_LABELS[entry.targetType] ?? entry.targetType} #{entry.targetId}
                    </span>
                  </p>
                  {describeAuditDetails(entry) ? (
                    <p className="text-xs text-mist">{describeAuditDetails(entry)}</p>
                  ) : null}
                </div>
                <div className="text-right text-xs text-mist">
                  <p>{formatDateTime(entry.createdAt)}</p>
                  <p>{entry.actorEmail ?? (entry.actorUserId ? `Usuario #${entry.actorUserId}` : "Sistema")}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 flex justify-between text-sm">
          {antes ? (
            <Link href="/admin/auditoria" className="text-lime hover:underline">
              Volver a lo más reciente
            </Link>
          ) : (
            <span />
          )}
          {entries.length === AUDIT_PAGE_SIZE && oldestEntry ? (
            <Link href={`/admin/auditoria?antes=${oldestEntry.auditId}`} className="text-lime hover:underline">
              Ver más antiguas
            </Link>
          ) : null}
        </div>
      </PanelSection>
    </div>
  );
}
