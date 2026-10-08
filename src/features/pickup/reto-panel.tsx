"use client";

import type { PickupReto, PickupTeam } from "@/domain/pickup";
import { formatDateTime } from "@/shared/lib/datetime";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
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
      setError(payload.message ?? "No se pudo completar el reto");
      return;
    }
    router.refresh();
    /**
     * Output:
     * Side effects — Mutación de reto
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Tablero de retos
   */
  return (
    <div className="space-y-8">
      {error ? <Alert>{error}</Alert> : null}
      {!isCaptain ? (
        <p className="text-sm text-mist">
          Necesitas ser capitán de un equipo para retar.
        </p>
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
            label="Buscar rival"
            name="rivalQuery"
            onChange={(event) => void searchRivals(event.target.value)}
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-mist">Equipo rival</span>
            <select
              name="challengedTeamId"
              required
              className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone"
            >
              <option value="">Elige un equipo</option>
              {rivals.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <TextField label="Cancha" name="venueText" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Fecha" name="date" type="date" required />
            <TextField label="Hora" name="time" type="time" required />
          </div>
          <Button type="submit">Enviar reto</Button>
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
              {reto.venueText} · {formatDateTime(reto.proposedStartsAt)}
            </p>
            {reto.status === "pending" && reto.matchId === null ? (
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => post({ action: "accept", retoId: reto.id })}
                >
                  Aceptar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => post({ action: "decline", retoId: reto.id })}
                >
                  Rechazar
                </Button>
              </div>
            ) : null}
            {reto.status === "accepted" && reto.matchId ? (
              <p className="mt-3 text-sm text-lime">
                Partido creado. ¡A llenar la cancha!
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
