"use client";

import { useI18n } from "@/core/i18n/provider";
import type { PlayerContact } from "@/domain/messaging";
import { ContactLinks } from "@/features/messaging/contact-links";
import { OpenConversationButton } from "@/features/messaging/open-conversation-button";
import { formatDateTime } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";
import { useState } from "react";

/**
 * Propósito: "Contactar" en una reserva (staff). Pide el contacto bajo demanda (el backend lo
 * audita) y ofrece WhatsApp, correo o escribir por CanchaYa.
 */
export function ContactPlayerButton({
  reservationId,
  fieldName,
  establishmentName,
  startTime,
}: {
  reservationId: number;
  fieldName: string;
  establishmentName: string;
  startTime: string;
}) {
  const { t, intlLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [contact, setContact] = useState<PlayerContact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Propósito: Abre el panel y carga el contacto la primera vez.
   */
  async function toggle() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (!nextOpen || contact) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reservations/${reservationId}/contact`);
      const payload = (await response.json().catch(() => ({}))) as {
        contact?: PlayerContact;
        message?: string;
      };
      if (!response.ok || !payload.contact) {
        setError(payload.message ?? t("messaging.contactFailed"));
        return;
      }
      setContact(payload.contact);
    } catch {
      setError(t("messaging.contactFailed"));
    } finally {
      setIsLoading(false);
    }
    /**
     * Output:
     * Side effects — Contacto cargado o error visible
     */
  }

  const when = formatDateTime(startTime, intlLocale);
  const firstName = contact?.fullName.split(" ")[0] ?? "";
  const message = t("messaging.reservationTemplate", {
    name: firstName,
    venue: establishmentName,
    field: fieldName,
    when,
  });

  /**
   * Output:
   * @returns JSX.Element — Botón y panel desplegable con el contacto
   */
  return (
    <div className="w-full sm:w-auto">
      <Button
        type="button"
        variant="secondary"
        className="px-3 py-1 text-xs"
        aria-expanded={isOpen}
        isLoading={isLoading}
        onClick={() => void toggle()}
      >
        {t("messaging.contact")}
      </Button>
      {isOpen ? (
        <div className="mt-2 space-y-2 rounded-2xl border border-white/10 bg-ink/60 p-3 text-xs sm:absolute sm:right-4 sm:z-20 sm:w-80">
          {error ? <p className="text-danger">{error}</p> : null}
          {contact ? (
            <>
              <div>
                <p className="text-sm font-semibold text-bone">{contact.fullName}</p>
                <p className="text-mist">{contact.email}</p>
                <p className="text-mist">{contact.phone ?? t("messaging.noPhone")}</p>
              </div>
              <ContactLinks
                whatsapp={contact.whatsapp}
                email={contact.email}
                subject={t("messaging.reservationSubject", { venue: establishmentName, when })}
                message={message}
              />
              <OpenConversationButton
                subjectType="reservation"
                subjectId={reservationId}
                label={t("messaging.writeInApp")}
              />
              <p className="text-[11px] text-mist/70">{t("messaging.contactAuditNote")}</p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
