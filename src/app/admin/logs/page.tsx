import { requireSuperAdminAccess } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import {
  ERROR_LOG_LEVEL_KEYS,
  ERROR_LOG_SOURCE_KEYS,
  translateMappedLabel,
} from "@/core/i18n/label-keys";
import { listErrorLogs } from "@/data/platform.repository";
import {
  ERROR_LOG_LEVELS,
  ERROR_LOG_SOURCES,
  type ErrorLogLevel,
} from "@/domain/observability";
import { PanelSection, StatCard, StatusPill, type PillTone } from "@/features/admin/platform/platform-ui";
import { formatDateTime } from "@/shared/lib/datetime";
import { buttonClassName } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import Link from "next/link";

/**
 * Propósito: Metadata de logs de plataforma.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("platform.logsMeta") };
}

const LOGS_PATH = "/admin/logs";
const LOGS_PAGE_SIZE = 50;

const LEVEL_TONES: Record<ErrorLogLevel, PillTone> = {
  warn: "warning",
  error: "danger",
  fatal: "danger",
};

/**
 * Propósito: Arma la URL de filtros y paginación.
 */
function buildLogsHref(filters: {
  level?: string | null;
  source?: string | null;
  fingerprint?: string | null;
  search?: string | null;
  beforeErrorId?: number;
}): string {
  const searchParams = new URLSearchParams();
  if (filters.level) searchParams.set("nivel", filters.level);
  if (filters.source) searchParams.set("origen", filters.source);
  if (filters.fingerprint) searchParams.set("grupo", filters.fingerprint);
  if (filters.search) searchParams.set("q", filters.search);
  if (filters.beforeErrorId) searchParams.set("antes", String(filters.beforeErrorId));
  const query = searchParams.toString();
  /**
   * Output:
   * @returns string — Ruta con query
   */
  return query ? `${LOGS_PATH}?${query}` : LOGS_PATH;
}

/**
 * Propósito: Bitácora buscable de errores de API, BFF y navegador.
 */
export default async function PlatformLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ nivel?: string; origen?: string; grupo?: string; q?: string; antes?: string }>;
}) {
  const [{ t, intlLocale }, , params] = await Promise.all([
    getTranslator(),
    requireSuperAdminAccess(),
    searchParams,
  ]);
  const levelFilter = ERROR_LOG_LEVELS.find((level) => level === params.nivel);
  const sourceFilter = ERROR_LOG_SOURCES.find((source) => source === params.origen);
  const fingerprintFilter = params.grupo?.trim().slice(0, 16) || undefined;
  const searchFilter = params.q?.trim().slice(0, 80) || undefined;
  const beforeErrorId = Number(params.antes);
  const page = await listErrorLogs({
    level: levelFilter,
    source: sourceFilter,
    fingerprint: fingerprintFilter,
    search: searchFilter,
    beforeErrorId: Number.isInteger(beforeErrorId) && beforeErrorId > 0 ? beforeErrorId : undefined,
    limit: LOGS_PAGE_SIZE,
  });
  const oldestEntry = page.entries.at(-1);
  const currentFilters = {
    level: levelFilter ?? null,
    source: sourceFilter ?? null,
    fingerprint: fingerprintFilter ?? null,
    search: searchFilter ?? null,
  };

  /**
   * Output:
   * @returns JSX.Element — Filtros, KPIs y lista de errores
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t("platform.kicker")}
        title={t("platform.logsTitle")}
        description={t("platform.logsDescription")}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("platform.errors24h")}
          value={String(page.summary.errorsLast24h)}
          tone={page.summary.errorsLast24h > 0 ? "danger" : "positive"}
        />
        <StatCard label={t("platform.warnings24h")} value={String(page.summary.warningsLast24h)} />
        <StatCard
          label={t("platform.unique24h")}
          value={String(page.summary.uniqueFingerprintsLast24h)}
          detail={t("platform.unique24hDetail")}
        />
      </div>

      <form method="get" action={LOGS_PATH} className="flex flex-wrap items-end gap-3">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-mist">{t("common.search")}</span>
          <input
            name="q"
            defaultValue={searchFilter ?? ""}
            maxLength={80}
            placeholder={t("platform.logsSearch")}
            className="w-56 rounded-2xl border border-white/10 bg-ink/40 px-3 py-2 text-sm text-bone outline-none focus:border-lime/70"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-mist">{t("platform.logsLevel")}</span>
          <select
            name="nivel"
            defaultValue={levelFilter ?? ""}
            className="rounded-2xl border border-white/10 bg-ink/40 px-3 py-2 text-sm text-bone"
          >
            <option value="">{t("platform.allFilter")}</option>
            {ERROR_LOG_LEVELS.map((level) => (
              <option key={level} value={level}>
                {translateMappedLabel(t, ERROR_LOG_LEVEL_KEYS, level)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-mist">{t("platform.logsSource")}</span>
          <select
            name="origen"
            defaultValue={sourceFilter ?? ""}
            className="rounded-2xl border border-white/10 bg-ink/40 px-3 py-2 text-sm text-bone"
          >
            <option value="">{t("platform.allFilter")}</option>
            {ERROR_LOG_SOURCES.map((source) => (
              <option key={source} value={source}>
                {translateMappedLabel(t, ERROR_LOG_SOURCE_KEYS, source)}
              </option>
            ))}
          </select>
        </label>
        {fingerprintFilter ? (
          <input type="hidden" name="grupo" value={fingerprintFilter} />
        ) : null}
        <button type="submit" className={buttonClassName("secondary", "py-2 text-xs")}>
          {t("platform.filterButton")}
        </button>
        {levelFilter || sourceFilter || fingerprintFilter || searchFilter ? (
          <Link href={LOGS_PATH} className="text-xs text-mist hover:text-bone">
            {t("booking.clearFilters")}
          </Link>
        ) : null}
      </form>

      <PanelSection title={t("platform.recentEvents")}>
        {page.entries.length === 0 ? (
          <EmptyState
            title={t("platform.logsEmptyTitle")}
            description={t("platform.logsEmptyDescription")}
          />
        ) : (
          <ol className="divide-y divide-white/5">
            {page.entries.map((entry) => (
              <li key={entry.errorId} className="space-y-2 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={LEVEL_TONES[entry.level]}>
                        {translateMappedLabel(t, ERROR_LOG_LEVEL_KEYS, entry.level)}
                      </StatusPill>
                      <span className="text-xs text-mist">
                        {translateMappedLabel(t, ERROR_LOG_SOURCE_KEYS, entry.source)}
                        {entry.service ? ` · ${entry.service}` : ""}
                        {entry.statusCode ? ` · ${entry.statusCode}` : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-bone">
                      {entry.errorName}: {entry.errorMessage}
                    </p>
                    <p className="mt-1 text-xs text-mist">
                      {entry.requestMethod ?? t("common.none")} {entry.requestPath ?? t("platform.noPath")}
                      {entry.actorUserId ? ` · ${t("platform.actorUser", { id: entry.actorUserId })}` : ""}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-mist">
                      {t("platform.correlationIdLabel", { id: entry.correlationId })}
                      {" · "}
                      <Link
                        href={buildLogsHref({ ...currentFilters, fingerprint: entry.fingerprint })}
                        className="text-lime hover:underline"
                      >
                        {t("platform.groupId", { id: entry.fingerprint })}
                      </Link>
                    </p>
                  </div>
                  <p className="text-right text-xs text-mist">{formatDateTime(entry.occurredAt, intlLocale)}</p>
                </div>
                {entry.stack ? (
                  <details className="text-xs text-mist">
                    <summary className="cursor-pointer hover:text-bone">{t("platform.viewSourceStack")}</summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-white/3 p-3 font-mono text-[11px]">
                      {entry.stack}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 flex justify-between text-sm">
          {params.antes ? (
            <Link href={buildLogsHref(currentFilters)} className="text-lime hover:underline">
              {t("platform.auditBackRecent")}
            </Link>
          ) : (
            <span />
          )}
          {page.entries.length === LOGS_PAGE_SIZE && oldestEntry ? (
            <Link
              href={buildLogsHref({ ...currentFilters, beforeErrorId: oldestEntry.errorId })}
              className="text-lime hover:underline"
            >
              {t("platform.olderLogs")}
            </Link>
          ) : null}
        </div>
      </PanelSection>
    </div>
  );
}
