"use client";

import { formatBillingPeriod, type InvoiceGenerationResult } from "@/domain/platform";
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";
import { formatMoney } from "@/shared/lib/money";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useState } from "react";

/**
 * Propósito: Emite las facturas de un mes para todos los tenants con plan. Es idempotente:
 * volver a ejecutarlo no duplica facturas del mismo periodo.
 */
export function InvoiceGenerator({
  selectablePeriods,
  defaultPeriod,
}: {
  selectablePeriods: string[];
  defaultPeriod: string;
}) {
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const [generationResult, setGenerationResult] = useState<InvoiceGenerationResult | null>(null);

  /**
   * Propósito: Envía el periodo y notas al BFF y muestra el resumen.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await runMutation<{ result: InvoiceGenerationResult }>(
      "generate",
      "/api/platform/invoices",
      "POST",
      { period: String(formData.get("period")), notes: String(formData.get("notes") ?? "") || undefined },
    );
    setGenerationResult(response?.result ?? null);
  }

  const createdTotal = generationResult?.created.reduce((sum, invoice) => sum + invoice.totalAmount, 0) ?? 0;

  /**
   * Output:
   * @returns JSX.Element — Formulario de emisión + resultado
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage ? <Alert>{errorMessage}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-mist">Mes a facturar</span>
          <select
            name="period"
            defaultValue={defaultPeriod}
            className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 capitalize text-bone outline-none focus:border-lime/70"
          >
            {selectablePeriods.map((period) => (
              <option key={period} value={period} className="bg-ink">
                {formatBillingPeriod(period)}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-mist">Nota en la factura (opcional)</span>
          <input
            name="notes"
            maxLength={500}
            placeholder="Ej. Incluye ajuste de tarifa"
            className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone outline-none focus:border-lime/70"
          />
        </label>
        <Button type="submit" isLoading={pendingActionKey === "generate"}>
          Emitir facturas
        </Button>
      </div>
      {generationResult ? (
        <p role="status" className="rounded-2xl bg-lime/10 px-4 py-3 text-sm text-bone">
          {generationResult.created.length > 0
            ? `Se emitieron ${generationResult.created.length} facturas por ${formatMoney(createdTotal)}.`
            : "No se emitieron facturas nuevas."}{" "}
          {generationResult.skippedAlreadyInvoiced > 0
            ? `${generationResult.skippedAlreadyInvoiced} tenant(s) ya tenían factura de este mes. `
            : ""}
          {generationResult.skippedNothingToBill > 0
            ? `${generationResult.skippedNothingToBill} sin nada que cobrar (plan en $0 y sin comisión).`
            : ""}
        </p>
      ) : null}
    </form>
  );
}
