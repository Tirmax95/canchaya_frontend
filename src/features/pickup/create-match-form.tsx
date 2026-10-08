"use client";

import { BOGOTA } from "@/domain/pickup";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Convoca un partido draft y lo publica en un solo flujo.
 */
export function CreateMatchForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Propósito: Crea y publica. El backend valida fecha futura y ownership.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const startsAt = new Date(
      `${form.get("date")}T${form.get("time")}:00`,
    ).toISOString();
    const create = await fetch("/api/pickup/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sport: "futbol",
        venueText: form.get("venueText"),
        lat: Number(form.get("lat") || BOGOTA.lat),
        lng: Number(form.get("lng") || BOGOTA.lng),
        startsAt,
        totalSlots: Number(form.get("totalSlots")),
        pricePerSlot: Number(form.get("pricePerSlot")),
        skillLevel: form.get("skillLevel"),
      }),
    });
    const created = (await create.json()) as {
      match?: { id: number };
      message?: string;
    };
    if (!create.ok || !created.match) {
      setIsSubmitting(false);
      setError(created.message ?? "No se pudo convocar");
      return;
    }
    await fetch(`/api/pickup/matches/${created.match.id}?action=publish`, {
      method: "POST",
    });
    router.push(`/partidos/${created.match.id}`);
    router.refresh();
    /**
     * Output:
     * Side effects — Partido abierto y navegación al detalle
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Formulario de convocatoria
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <Alert>{error}</Alert> : null}
      <TextField
        label="Cancha o punto de encuentro"
        name="venueText"
        required
        placeholder="Parque El Virrey, cancha 2"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Fecha" name="date" type="date" required />
        <TextField label="Hora" name="time" type="time" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Cupos"
          name="totalSlots"
          type="number"
          min={2}
          max={30}
          defaultValue={10}
          required
        />
        <TextField
          label="Precio por cupo (COP)"
          name="pricePerSlot"
          type="number"
          min={0}
          defaultValue={15000}
          required
        />
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-mist">Nivel</span>
        <select
          name="skillLevel"
          defaultValue="amateur"
          className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone"
        >
          <option value="novato">Novato</option>
          <option value="amateur">Amateur</option>
          <option value="competitivo">Competitivo</option>
          <option value="elite">Elite</option>
        </select>
      </label>
      <input type="hidden" name="lat" defaultValue={BOGOTA.lat} />
      <input type="hidden" name="lng" defaultValue={BOGOTA.lng} />
      <Button type="submit" isLoading={isSubmitting}>
        Publicar partido
      </Button>
    </form>
  );
}
