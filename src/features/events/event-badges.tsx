"use client";

import {
  EVENT_PAYMENT_STATUS_KEYS,
  EVENT_REGISTRATION_STATUS_KEYS,
  EVENT_STATUS_KEYS,
} from "@/core/i18n/label-keys";
import { useI18n } from "@/core/i18n/provider";
import type {
  EventStatus,
  RegistrationPaymentStatus,
  RegistrationStatus,
} from "@/domain/events";
import { cn } from "@/shared/lib/cn";

const EVENT_STATUS_STYLES: Record<EventStatus, string> = {
  draft: "bg-white/10 text-mist",
  registration_open: "bg-lime/15 text-lime",
  registration_closed: "bg-clay/15 text-clay",
  in_progress: "bg-flare/15 text-flare",
  completed: "bg-white/10 text-bone",
  cancelled: "bg-danger/15 text-danger",
};

const REGISTRATION_STYLES: Record<RegistrationStatus, string> = {
  pending_payment: "bg-clay/15 text-clay",
  pending_approval: "bg-flare/15 text-flare",
  confirmed: "bg-lime/15 text-lime",
  waitlisted: "bg-white/10 text-mist",
  rejected: "bg-danger/15 text-danger",
  withdrawn: "bg-white/5 text-mist/70",
};

const PAYMENT_STYLES: Record<RegistrationPaymentStatus, string> = {
  not_required: "bg-white/5 text-mist",
  pending: "bg-clay/15 text-clay",
  paid: "bg-lime/15 text-lime",
  refund_due: "bg-danger/15 text-danger",
  refunded: "bg-white/10 text-mist",
};

const BADGE_CLASS =
  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider";

/**
 * Propósito: Chip del estado del evento.
 */
export function EventStatusBadge({ status }: { status: EventStatus }) {
  const { t } = useI18n();
  /**
   * Output:
   * @returns JSX.Element — Chip
   */
  return <span className={cn(BADGE_CLASS, EVENT_STATUS_STYLES[status])}>{t(EVENT_STATUS_KEYS[status])}</span>;
}

/**
 * Propósito: Chip del estado de una inscripción.
 */
export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  const { t } = useI18n();
  /**
   * Output:
   * @returns JSX.Element — Chip
   */
  return (
    <span className={cn(BADGE_CLASS, REGISTRATION_STYLES[status])}>
      {t(EVENT_REGISTRATION_STATUS_KEYS[status])}
    </span>
  );
}

/**
 * Propósito: Chip del estado de pago de una inscripción.
 */
export function PaymentStatusBadge({ status }: { status: RegistrationPaymentStatus }) {
  const { t } = useI18n();
  /**
   * Output:
   * @returns JSX.Element — Chip
   */
  return (
    <span className={cn(BADGE_CLASS, PAYMENT_STYLES[status])}>{t(EVENT_PAYMENT_STATUS_KEYS[status])}</span>
  );
}
