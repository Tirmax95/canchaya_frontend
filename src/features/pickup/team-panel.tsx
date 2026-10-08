"use client";

import type { PickupInvite, PickupTeam } from "@/domain/pickup";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Crea equipos, responde invitaciones e invita por celular.
 */
export function TeamPanel({
  teams,
  invites,
  userId,
}: {
  teams: PickupTeam[];
  invites: PickupInvite[];
  userId: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const captainTeam = teams.find((team) => team.captainId === userId);

  /**
   * Propósito: POST al BFF de equipos y refresca RSC.
   */
  async function post(body: Record<string, unknown>) {
    setError(null);
    const response = await fetch("/api/pickup/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? "No se pudo completar");
      return;
    }
    router.refresh();
    /**
     * Output:
     * Side effects — Mutación de equipo
     */
  }

  /**
   * Propósito: Busca por teléfono e invita al equipo del capitán.
   */
  async function inviteByPhone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captainTeam) return;
    const phone = String(new FormData(event.currentTarget).get("phone") ?? "");
    const response = await fetch(
      `/api/pickup/teams?view=user&phone=${encodeURIComponent(phone)}`,
    );
    const payload = (await response.json()) as {
      user?: { id: number; fullName?: string } | null;
      message?: string;
    };
    if (!payload.user) {
      setError("No encontramos a nadie con ese celular");
      return;
    }
    await post({
      action: "invite",
      teamId: captainTeam.id,
      userId: payload.user.id,
    });
    setInfo(`Invitaste a ${payload.user.fullName ?? "un jugador"}`);
    /**
     * Output:
     * Side effects — Invitación enviada
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Panel de equipos
   */
  return (
    <div className="space-y-8">
      {error ? <Alert>{error}</Alert> : null}
      {info ? <p className="text-sm text-lime">{info}</p> : null}

      {invites.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-2xl text-bone">Invitaciones</h2>
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-pitch p-4"
            >
              <p className="text-bone">{invite.teamName ?? "Equipo"}</p>
              <div className="flex gap-2">
                <Button onClick={() => post({ action: "accept", inviteId: invite.id })}>
                  Aceptar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => post({ action: "decline", inviteId: invite.id })}
                >
                  Rechazar
                </Button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const name = String(new FormData(event.currentTarget).get("name") ?? "");
          await post({ name });
        }}
      >
        <TextField label="Nuevo equipo" name="name" required />
        <Button type="submit">Crear</Button>
      </form>

      {teams.map((team) => (
        <article key={team.id} className="rounded-[28px] border border-white/8 bg-pitch p-5">
          <h3 className="font-display text-2xl text-bone">{team.name}</h3>
          <p className="text-sm text-mist">{team.members.length} jugadores</p>
          <ul className="mt-3 space-y-1 text-sm text-mist">
            {team.members.map((member) => (
              <li key={`${team.id}-${member.userId}`}>
                {member.name ?? `Jugador ${member.userId}`} · {member.role}
              </li>
            ))}
          </ul>
        </article>
      ))}

      {captainTeam ? (
        <form onSubmit={inviteByPhone} className="flex flex-wrap items-end gap-3">
          <TextField
            label="Invitar por celular"
            name="phone"
            placeholder="+573001112233"
            required
          />
          <Button type="submit">Invitar</Button>
        </form>
      ) : null}
    </div>
  );
}
