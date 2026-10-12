"use client";

import { useI18n } from "@/core/i18n/provider";
import type { PickupReto, PickupTeam } from "@/domain/pickup";
import { formatDateTime } from "@/shared/lib/datetime";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { TextField } from "@/shared/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Lista retos y permite enviar uno si el actor es capitán.
 */
export function RetoPanel({
  retos,
  isCaptain,
}: {
  retos: PickupReto[];
  isCaptain: boolean;
}) {
  const router = useRouter();
  const { t, intlLocale } = useI18n();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [error, setError] = useState<string | null>(null);
  const [rivals, setRivals] = useState<PickupTeam[]>([]);

  /**
   * Propósito: Busca rivales por nombre.
   */
  async function searchRivals(query: string) {
    if (query.trim().length < 2) {
      setRivals([]);
      return;
    }
    const response = await fetch(
      `/api/pickup/teams?view=search&q=${encodeURIComponent(query)}`,
    );
    const payload = (await response.json()) as { teams?: PickupTeam[] };
    setRivals(payload.teams ?? []);
    /**
     * Output:
     * Side effects — Lista de rivales
     */
  }

  /**
   * Propósito: Crea o responde un reto vía BFF.
   */
  async function post(body: Record<string, unknown>) {
    setError(null);
    const response = await fetch("/api/pickup/retos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? t("pickup.retoFailed"));
      return;
    }
    router.refresh();
    /**
     * Output:
     * Side effects — Mutación de reto
     */
  }

  /**
   * Propósito: Pide confirmación antes de aceptar o rechazar un reto.
   */
  function requestRetoDecision(reto: PickupReto, action: "accept" | "decline") {
    const rivalName = reto.challengerTeamName?.trim() || t("pickup.rivalFallback");
    const isDecline = action === "decline";
    askConfirmation({
      title: isDecline
        ? t("pickup.declineChallengeTitle", { name: rivalName })
        : t("pickup.acceptChallengeTitle", { name: rivalName }),
      description: isDecline
        ? t("pickup.declineChallengeDescription")
        : t("pickup.acceptChallengeDescription"),
      confirmLabel: isDecline ? t("pickup.declineChallengeYes") : t("pickup.acceptChallengeYes"),
      tone: isDecline ? "danger" : "primary",
      run: () => post({ action, retoId: reto.id }),
    });
    /**
     * Output:
     * Side effects — Abre el modal; el reto no cambia hasta aceptar
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Tablero de retos
   */
  return (
    <div className="space-y-8">
      {confirmationDialog}
      {error ? <Alert>{error}</Alert> : null}
      {!isCaptain ? (
        <p className="text-sm text-mist">{t("pickup.needCaptain")}</p>
      ) : (
        <form
          className="grid gap-4 rounded-[28px] border border-white/8 bg-pitch p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const startsAt = new Date(
              `${form.get("date")}T${form.get("time")}:00`,
            ).toISOString();
            await post({
              challengedTeamId: Number(form.get("challengedTeamId")),
              proposedStartsAt: startsAt,
              venueText: form.get("venueText"),
            });
          }}
        >
          <TextField
            label={t("pickup.searchRival")}
            name="rivalQuery"
            onChange={(event) => void searchRivals(event.target.value)}
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-mist">{t("pickup.rivalTeamLabel")}</span>
            <select
              name="challengedTeamId"
              required
              className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone"
            >
              <option value="">{t("pickup.chooseTeam")}</option>
              {rivals.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <TextField label={t("pickup.court")} name="venueText" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={t("pickup.date")} name="date" type="date" required />
            <TextField label={t("pickup.time")} name="time" type="time" required />
          </div>
          <Button type="submit">{t("pickup.sendChallenge")}</Button>
        </form>
      )}

      <div className="space-y-3">
        {retos.map((reto) => (
          <article
            key={reto.id}
            className="rounded-[28px] border border-white/8 bg-pitch p-5"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-lime">
              {reto.status}
            </p>
            <h3 className="mt-2 font-display text-2xl text-bone">
              {reto.challengerTeamName} vs {reto.challengedTeamName}
            </h3>
            <p className="text-sm text-mist">
              {reto.venueText} · {formatDateTime(reto.proposedStartsAt, intlLocale)}
            </p>
            {reto.status === "pending" && reto.matchId === null ? (
              <div className="mt-4 flex gap-2">
                <Button onClick={() => requestRetoDecision(reto, "accept")}>
                  {t("pickup.accept")}
                </Button>
                <Button variant="secondary" onClick={() => requestRetoDecision(reto, "decline")}>
                  {t("pickup.decline")}
                </Button>
              </div>
            ) : null}
            {reto.status === "accepted" && reto.matchId ? (
              <p className="mt-3 text-sm text-lime">{t("pickup.matchCreatedHint")}</p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
