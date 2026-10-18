"use client";

import { useI18n } from "@/core/i18n/provider";
import { translateTenantModuleLabel } from "@/core/i18n/label-keys";
import type { MessageKey } from "@/core/i18n/messages";
import {
  TENANT_MODULES,
  TENANT_MODULE_DEFINITIONS,
  normalizeTenantModules,
  type TenantModule,
  type TenantModuleSection,
} from "@/domain/tenant-modules";

const TENANT_MODULE_HINT_KEYS: Record<TenantModule, MessageKey> = {
  dashboard: "admin.moduleDashboardHint",
  establishments: "admin.moduleVenuesHint",
  fields: "admin.moduleCourtsHint",
  reservations: "admin.moduleReservationsHint",
  events: "admin.moduleEventsHint",
  news: "admin.moduleNewsHint",
  messages: "admin.moduleMessagesHint",
  matches: "admin.moduleMatchesHint",
  challenges: "admin.moduleChallengesHint",
  teams: "admin.moduleTeamsHint",
  billing: "admin.moduleBillingHint",
  staff: "admin.moduleStaffHint",
};

const SECTION_TITLE_KEYS: Record<TenantModuleSection, MessageKey> = {
  panel: "admin.modulesSectionPanel",
  explore: "admin.modulesSectionExplore",
  account: "admin.modulesSectionAccount",
};

const MENU_SECTIONS: TenantModuleSection[] = ["panel", "explore", "account"];
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";
import { cn } from "@/shared/lib/cn";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useState } from "react";

/**
 * Propósito: Toggles de módulos de un tenant con guardado explícito (evita un PUT por clic).
 */
export function TenantModulesForm({
  organizationId,
  initialModules,
}: {
  organizationId: number;
  initialModules: string[];
}) {
  const { t } = useI18n();
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const [savedModules, setSavedModules] = useState<TenantModule[]>(() =>
    normalizeTenantModules(initialModules),
  );
  const [draftModules, setDraftModules] = useState<TenantModule[]>(savedModules);
  const hasChanges =
    draftModules.length !== savedModules.length ||
    draftModules.some((tenantModule) => !savedModules.includes(tenantModule));

  /**
   * Propósito: Activa/desactiva un módulo manteniendo el orden canónico del catálogo.
   */
  function toggleModule(tenantModule: TenantModule) {
    setDraftModules((currentModules) => {
      const nextModules = new Set(currentModules);
      if (nextModules.has(tenantModule)) {
        nextModules.delete(tenantModule);
      } else {
        nextModules.add(tenantModule);
      }
      return TENANT_MODULES.filter((candidate) => nextModules.has(candidate));
    });
  }

  /**
   * Propósito: Persiste el borrador vía BFF.
   */
  async function handleSave() {
    const response = await runMutation<{ organization?: { enabledModules: string[] } }>(
      "modules",
      `/api/organizations/${organizationId}/modules`,
      "PUT",
      { enabledModules: draftModules },
    );
    if (response?.organization) {
      const persistedModules = normalizeTenantModules(response.organization.enabledModules);
      setSavedModules(persistedModules);
      setDraftModules(persistedModules);
    }
  }

  /**
   * Output:
   * @returns JSX.Element — Toggles y guardar
   */
  return (
    <div className="space-y-3">
      {errorMessage ? <Alert>{errorMessage}</Alert> : null}
      {MENU_SECTIONS.map((section) => (
        <div key={section} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mist">
            {t(SECTION_TITLE_KEYS[section])}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TENANT_MODULES.filter(
              (tenantModule) => TENANT_MODULE_DEFINITIONS[tenantModule].section === section,
            ).map((tenantModule) => {
              const isEnabled = draftModules.includes(tenantModule);
              return (
                <button
                  key={tenantModule}
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  onClick={() => toggleModule(tenantModule)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-3 text-left transition",
                    isEnabled
                      ? "border-lime/40 bg-lime/8"
                      : "border-white/10 bg-white/3 opacity-70 hover:opacity-100",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition",
                      isEnabled ? "bg-lime" : "bg-white/15",
                    )}
                  >
                    <span
                      className={cn(
                        "size-4 rounded-full bg-ink transition-transform",
                        isEnabled && "translate-x-4",
                      )}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-bone">
                      {translateTenantModuleLabel(t, tenantModule)}
                    </span>
                    <span className="block text-xs leading-5 text-mist">
                      {t(TENANT_MODULE_HINT_KEYS[tenantModule])}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          isLoading={pendingActionKey === "modules"}
          className="px-4 py-2 text-xs"
        >
          {t("admin.saveModules")}
        </Button>
      </div>
    </div>
  );
}
