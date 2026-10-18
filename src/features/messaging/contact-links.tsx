"use client";

import { useI18n } from "@/core/i18n/provider";
import { buildMailtoUrl, buildWhatsappUrl } from "@/domain/messaging";

/**
 * Propósito: Botones WhatsApp y Correo con un mensaje ya escrito. Si no hay teléfono válido,
 * solo se muestra el correo.
 */
export function ContactLinks({
  whatsapp,
  email,
  subject,
  message,
}: {
  whatsapp: string | null;
  email: string;
  subject: string;
  message: string;
}) {
  const { t } = useI18n();
  const whatsappUrl = buildWhatsappUrl(whatsapp, message);
  const linkClassName =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition";

  /**
   * Output:
   * @returns JSX.Element — Enlaces externos (nueva pestaña, sin referrer)
   */
  return (
    <span className="inline-flex flex-wrap gap-2">
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkClassName} border-[#25d366]/40 bg-[#25d366]/10 text-[#7ef0a8] hover:bg-[#25d366]/20`}
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M10 2a8 8 0 0 0-6.9 12l-1.1 4 4.1-1.1A8 8 0 1 0 10 2Zm4.3 11.2c-.2.5-1 1-1.5 1-.4.1-.9.1-2.8-.6-2.3-1-3.8-3.3-3.9-3.5-.1-.1-1-1.3-1-2.4s.6-1.7.8-2c.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .5.4l.7 1.6c.1.1.1.3 0 .4l-.3.5-.3.3c-.1.1-.2.3-.1.5.2.3.7 1.1 1.4 1.7.9.8 1.7 1 2 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l1.5.7c.2.1.4.2.4.3.1.1.1.6-.1 1.2Z" />
          </svg>
          {t("messaging.whatsapp")}
        </a>
      ) : null}
      <a
        href={buildMailtoUrl(email, subject, message)}
        className={`${linkClassName} border-white/12 bg-white/5 text-bone hover:bg-white/10`}
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M3 5h14v10H3V5Zm0 0 7 6 7-6" />
        </svg>
        {t("messaging.email")}
      </a>
    </span>
  );
}
