"use client";

import { useI18n } from "@/core/i18n/provider";
import type { Establishment } from "@/domain/establishment";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Crea o actualiza una sede vía BFF con validación Zod en servidor.
 */
export function EstablishmentForm({
  establishment,
}: {
  establishment?: Establishment;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(establishment);

  /**
   * Propósito: Envía el contrato snake_case que espera NestJS.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const body = {
      name: String(formData.get("name") ?? ""),
      address: String(formData.get("address") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      image_establishment: String(formData.get("image_establishment") ?? ""),
    };
    const response = await fetch(
      isEditing
        ? `/api/establishments/${establishment?.establishmentId}`
        : "/api/establishments",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? t("admin.saveVenueFailed"));
      setIsSubmitting(false);
      return;
    }
    router.push("/admin/establecimientos");
    router.refresh();
  }

  /**
   * Output:
   * @returns JSX.Element — Formulario de sede
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <Alert>{error}</Alert> : null}
      <TextField
        label={t("admin.tableName")}
        name="name"
        required
        defaultValue={establishment?.name}
      />
      <TextField
        label={t("admin.tableAddress")}
        name="address"
        required
        defaultValue={establishment?.address}
      />
      <TextField label={t("admin.formPhone")} name="phone" defaultValue={establishment?.phone} />
      <TextField
        label={t("admin.imageUrl")}
        name="image_establishment"
        required
        defaultValue={establishment?.imageEstablishment}
        placeholder="https://..."
      />
      <Button type="submit" isLoading={isSubmitting}>
        {isEditing ? t("admin.submitUpdateVenue") : t("admin.submitCreateVenue")}
      </Button>
    </form>
  );
}
