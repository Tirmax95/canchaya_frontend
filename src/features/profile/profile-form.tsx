"use client";

import { useI18n } from "@/core/i18n/provider";
import type { SessionUser } from "@/domain/user";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Edita el perfil del usuario autenticado a través del BFF.
 */
export function ProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Propósito: Envía solo campos allowlisteados del perfil.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email") ?? ""),
        fullName: String(formData.get("fullName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
      }),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? t("profile.updateFailed"));
    } else {
      setSuccess(t("profile.updated"));
      router.refresh();
    }
    setIsSubmitting(false);
  }

  /**
   * Output:
   * @returns JSX.Element — Formulario de perfil
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <Alert>{error}</Alert> : null}
      {success ? <Alert tone="info">{success}</Alert> : null}
      <TextField label={t("profile.name")} name="fullName" defaultValue={user.fullName ?? ""} />
      <TextField
        label={t("profile.email")}
        name="email"
        type="email"
        defaultValue={user.email}
        required
      />
      <TextField
        label={t("profile.phone")}
        name="phone"
        defaultValue={user.phone ?? ""}
        placeholder="+573001112233"
      />
      <Button type="submit" isLoading={isSubmitting}>
        {t("profile.saveChanges")}
      </Button>
    </form>
  );
}
