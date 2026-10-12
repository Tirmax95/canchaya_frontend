import { requireSuperAdminAccess } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { listPaymentGateways } from "@/data/payment.repository";
import { listPlatformTenants } from "@/data/platform.repository";
import { PaymentGatewaysPanel } from "@/features/admin/platform/payment-gateways-panel";
import { TenantOnlinePaymentsPanel } from "@/features/admin/platform/tenant-online-payments-panel";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Metadata de pasarelas de pago.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("platform.paymentsMeta") };
}

/**
 * Propósito: Super admin configura las pasarelas de CanchaYa y elige qué tenant cobra en línea.
 */
export default async function PaymentGatewaysPage() {
  const [{ t }] = await Promise.all([getTranslator(), requireSuperAdminAccess()]);
  const [{ gateways, pendingIntents }, tenants] = await Promise.all([
    listPaymentGateways(),
    listPlatformTenants(),
  ]);

  /**
   * Output:
   * @returns JSX.Element — Pasarelas + switches por tenant
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t("platform.kicker")}
        title={t("platform.paymentsTitle")}
        description={t("platform.paymentsDescription")}
      />
      <PaymentGatewaysPanel gateways={gateways} pendingIntents={pendingIntents} />
      <TenantOnlinePaymentsPanel tenants={tenants} />
    </div>
  );
}
