import { requireSuperAdminAccess } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import {
  AUDIT_ACTION_KEYS,
  translateMappedLabel,
} from "@/core/i18n/label-keys";
import { listAuditEntries } from "@/data/platform.repository";
import type { AuditEntry } from "@/domain/platform";
import { PanelSection } from "@/features/admin/platform/platform-ui";
import type { TranslateFn } from "@/core/i18n/translate";
import { formatDateTime } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import Link from "next/link";

const AUDIT_PAGE_SIZE = 50;

/**
 * Propósito: Metadata de auditoría de plataforma.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.auditMeta") };
}

/**
 * Propósito: Etiqueta del objetivo de una entrada de auditoría.
 */
function auditTargetLabel(t: TranslateFn, targetType: string): string {
  if (targetType === "user") {
    /**
     * Output:
     * @returns string — Usuario
     */
    return t("platform.targetUser");
  }
  if (targetType === "organization") {
    /**
     * Output:
     * @returns string — Tenant
     */
    return t("platform.targetOrg");
  }
  if (targetType === "invoice") {
    /**
     * Output:
     * @returns string — Factura
     */
    return t("platform.targetInvoice");
  }
  /**
   * Output:
   * @returns string — Tipo crudo si no hay clave
   */
  return targetType;
}

/**
 * Propósito: Resume los detalles relevantes de una entrada para lectura humana.
 */
function describeAuditDetails(
  entry: AuditEntry,
  t: TranslateFn,
  intlLocale: string,
  consultLabel: string,
): string {
  const { details } = entry;
  const parts: string[] = [];
  if (typeof details.reason === "string") {
    parts.push(t("platform.auditReason", { reason: details.reason }));
  }
  if (typeof details.paymentReference === "string") {
    parts.push(t("platform.auditRef", { reference: details.paymentReference }));
  }
  if (typeof details.totalAmount === "number") {
    parts.push(
      t("platform.auditTotal", {
        amount: formatMoney(details.totalAmount, intlLocale, consultLabel),
      }),
    );
  }
  if (typeof details.period === "string") {
    parts.push(t("platform.auditPeriod", { period: details.period }));
  }
  if (typeof details.monthlyFee === "number") {
    parts.push(
      t("platform.auditMonthly", {
        amount: formatMoney(details.monthlyFee, intlLocale, consultLabel),
      }),
    );
  }
  if (typeof details.commissionBps === "number") {
    parts.push(t("platform.auditCommission", { percent: details.commissionBps / 100 }));
  }
  if (Array.isArray(details.enabledModules)) {
    parts.push(
      t("platform.auditModules", {
        modules: details.enabledModules.join(", ") || t("platform.auditModulesNone"),
      }),
    );
  }
  if (typeof details.isEnabled === "boolean") {
    parts.push(details.isEnabled ? t("common.on") : t("common.off"));
  }
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
  const [{ t, intlLocale }, , { antes }] = await Promise.all([
    getTranslator(),
    requireSuperAdminAccess(),
    searchParams,
  ]);
  const consultLabel = t("common.consult");
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
        kicker={t("platform.kicker")}
        title={t("platform.auditTitle")}
        description={t("platform.auditDescription")}
      />
      <PanelSection title={t("platform.recentActions")}>
        {entries.length === 0 ? (
          <EmptyState
            title={t("platform.auditEmptyTitle")}
            description={t("platform.auditEmptyDescription")}
          />
        ) : (
          <ol className="divide-y divide-white/5">
            {entries.map((entry) => {
              const detailText = describeAuditDetails(entry, t, intlLocale, consultLabel);
              return (
                <li key={entry.auditId} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-bone">
                      {translateMappedLabel(t, AUDIT_ACTION_KEYS, entry.action)}{" "}
                      <span className="text-mist">
                        · {auditTargetLabel(t, entry.targetType)} #{entry.targetId}
                      </span>
                    </p>
                    {detailText ? <p className="text-xs text-mist">{detailText}</p> : null}
                  </div>
                  <div className="text-right text-xs text-mist">
                    <p>{formatDateTime(entry.createdAt, intlLocale)}</p>
                    <p>
                      {entry.actorEmail ??
                        (entry.actorUserId
                          ? t("platform.userNumber", { id: entry.actorUserId })
                          : t("common.system"))}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-4 flex justify-between text-sm">
          {antes ? (
            <Link href="/admin/auditoria" className="text-lime hover:underline">
              {t("platform.auditBackRecent")}
            </Link>
          ) : (
            <span />
          )}
          {entries.length === AUDIT_PAGE_SIZE && oldestEntry ? (
            <Link href={`/admin/auditoria?antes=${oldestEntry.auditId}`} className="text-lime hover:underline">
              {t("platform.auditOlder")}
            </Link>
          ) : null}
        </div>
      </PanelSection>
    </div>
  );
}
