"use client";

import { useI18n } from "@/core/i18n/provider";
import type { Establishment } from "@/domain/establishment";
import type { Field } from "@/domain/field";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextAreaField, TextField } from "@/shared/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Crea o actualiza una cancha. owner_id se toma de la sesión en el BFF
 * si no se envía, pero el form lo incluye para el contrato del backend.
 */
export function FieldForm({
  field,
  establishments,
  ownerId,
  defaultEstablishmentId,
}: {
  field?: Field;
  establishments: Establishment[];
  ownerId: number;
  defaultEstablishmentId?: number;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(field);

  /**
   * Propósito: Persiste la cancha con el DTO exacto del backend.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const body = {
      id_establishment: Number(formData.get("id_establishment")),
      number_field: String(formData.get("number_field") ?? ""),
      description: String(formData.get("description") ?? ""),
      base_price_per_hour: Number(formData.get("base_price_per_hour")),
      owner_id: ownerId,
      image_fields: String(formData.get("image_fields") ?? ""),
    };
    const response = await fetch(
      isEditing ? `/api/fields/${field?.id}` : "/api/fields",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? t("admin.saveFieldFailed"));
      setIsSubmitting(false);
      return;
    }
    router.push("/admin/canchas");
    router.refresh();
  }

  /**
   * Output:
   * @returns JSX.Element — Formulario de cancha
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <Alert>{error}</Alert> : null}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-mist">{t("admin.formVenueLabel")}</span>
        <select
          name="id_establishment"
          required
          defaultValue={field?.establishmentId ?? defaultEstablishmentId}
          className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone outline-none focus:border-lime/70"
        >
          <option value="">{t("admin.formSelectVenue")}</option>
          {establishments.map((establishment) => (
            <option
              key={establishment.establishmentId}
              value={establishment.establishmentId}
            >
              {establishment.name}
            </option>
          ))}
        </select>
      </label>
      <TextField
        label={t("admin.courtNumber")}
        name="number_field"
        required
        defaultValue={field?.numberField}
      />
      <TextField
        label={t("admin.pricePerHour")}
        name="base_price_per_hour"
        type="number"
        min={1}
        required
        defaultValue={field?.basePricePerHour}
      />
      <TextField
        label={t("admin.imageUrl")}
        name="image_fields"
        required
        defaultValue={field?.imageFields}
      />
      <TextAreaField
        label={t("admin.description")}
        name="description"
        defaultValue={field?.description}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {isEditing ? t("admin.submitUpdateCourt") : t("admin.submitCreateCourt")}
      </Button>
    </form>
  );
}
