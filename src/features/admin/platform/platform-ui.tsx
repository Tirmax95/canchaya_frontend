import {
  INVOICE_STATUS_LABELS,
  type InvoiceStatusFilter,
  type PickupRevenue,
} from "@/domain/platform";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/money";

const PILL_TONES = {
  positive: "bg-lime/15 text-lime",
  warning: "bg-clay/20 text-clay",
  danger: "bg-danger/15 text-danger",
  neutral: "bg-white/10 text-mist",
} as const;

export type PillTone = keyof typeof PILL_TONES;

const INVOICE_STATUS_TONES: Record<InvoiceStatusFilter, PillTone> = {
  issued: "warning",
  overdue: "danger",
  paid: "positive",
  void: "neutral",
};

/**
 * Propósito: Chip de estado genérico del panel.
 */
export function StatusPill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  /**
   * Output:
   * @returns JSX.Element — Chip
   */
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        PILL_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/**
 * Propósito: Chip de estado de factura (emitida, vencida, pagada, anulada).
 */
export function InvoiceStatusPill({ status }: { status: InvoiceStatusFilter }) {
  /**
   * Output:
   * @returns JSX.Element — Chip de factura
   */
  return <StatusPill tone={INVOICE_STATUS_TONES[status]}>{INVOICE_STATUS_LABELS[status]}</StatusPill>;
}

/**
 * Propósito: Tarjeta de KPI con etiqueta, valor y detalle.
 */
export function StatCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "danger" | "positive";
}) {
  /**
   * Output:
   * @returns JSX.Element — KPI
   */
  return (
    <div
      className={cn(
        "rounded-[24px] border bg-pitch p-4",
        tone === "danger" ? "border-danger/30" : tone === "positive" ? "border-lime/30" : "border-white/8",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mist">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-3xl leading-none",
          tone === "danger" ? "text-danger" : tone === "positive" ? "text-lime" : "text-bone",
        )}
      >
        {value}
      </p>
      {detail ? <p className="mt-2 text-xs text-mist">{detail}</p> : null}
    </div>
  );
}

/**
 * Propósito: Contenedor de sección con título y acción opcional.
 */
export function PanelSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  /**
   * Output:
   * @returns JSX.Element — Sección del panel
   */
  return (
    <section className={cn("rounded-[28px] border border-white/8 bg-pitch p-5", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-bone">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Propósito: Tabla con scroll horizontal y estilos del panel.
 */
export function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  /**
   * Output:
   * @returns JSX.Element — Tabla responsiva
   */
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/8 text-[11px] uppercase tracking-[0.14em] text-mist">
            {headers.map((header) => (
              <th key={header} scope="col" className="px-3 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">{children}</tbody>
      </table>
    </div>
  );
}

/**
 * Propósito: Lo recaudado en partidos abiertos pagados. Es informativo: no entra en la
 * factura del tenant.
 */
export function PickupRevenueStats({
  pickupRevenue,
  periodLabel,
}: {
  pickupRevenue: PickupRevenue;
  periodLabel: string;
}) {
  /**
   * Output:
   * @returns JSX.Element — Tarjetas de partidos abiertos
   */
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard
        label={`Partidos abiertos (${periodLabel})`}
        value={formatMoney(pickupRevenue.collected)}
        detail={`${pickupRevenue.paidSlots} cupos pagados · informativo, no se factura`}
      />
      <StatCard label="Para organizadores" value={formatMoney(pickupRevenue.organizerShare)} />
      <StatCard label="Tarifa de servicio" value={formatMoney(pickupRevenue.platformFees)} tone="positive" />
    </div>
  );
}
