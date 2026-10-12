export const PAYMENT_INTENT_STATUSES = [
  "pending",
  "approved",
  "declined",
  "voided",
  "error",
  "expired",
] as const;
export type PaymentIntentStatus = (typeof PAYMENT_INTENT_STATUSES)[number];

export type CheckoutMode = "redirect" | "in_app";

export interface PaymentInstructions {
  title: string;
  steps: string[];
  destinationLabel?: string;
  destinationValue?: string;
}

export interface PublicPaymentMethod {
  methodId: number;
  code: string;
  displayName: string;
  description: string;
  gatewayCode: string;
  gatewayName: string;
  adapter: string;
  checkoutMode: CheckoutMode;
  sortOrder: number;
}

export interface PublicPaymentIntent {
  reference: string;
  status: PaymentIntentStatus;
  methodCode: string;
  gatewayCode: string;
  adapter: string;
  checkoutMode: CheckoutMode;
  checkoutUrl: string | null;
  instructions: PaymentInstructions | null;
  canConfirmLocally: boolean;
}

export interface ReservationPaymentContext {
  reservationId: number;
  status: string;
  startTime: string;
  endTime: string;
  amountPesos: number;
  fieldName: string;
  establishmentName: string;
  methods: PublicPaymentMethod[];
  intent: PublicPaymentIntent | null;
}

export interface AdminCredentialField {
  key: string;
  label: string;
  inputType: "text" | "password";
  required: boolean;
  placeholder?: string;
  helpText?: string;
  isSet: boolean;
  hint: string;
}

export interface AdminPublicConfigField {
  key: string;
  label: string;
  required: boolean;
  helpText?: string;
}

export interface AdminPaymentMethod {
  methodId: number;
  code: string;
  displayName: string;
  description: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface AdminPaymentGateway {
  gatewayId: number;
  code: string;
  displayName: string;
  description: string;
  adapter: string;
  isEnabled: boolean;
  isTestMode: boolean;
  isReady: boolean;
  sortOrder: number;
  credentialFields: AdminCredentialField[];
  publicConfigFields: AdminPublicConfigField[];
  publicConfig: Record<string, string>;
  methods: AdminPaymentMethod[];
}

export interface AdminPendingIntent {
  reference: string;
  purposeId: number;
  userId: number;
  gatewayCode: string;
  methodCode: string;
  amountInCents: number;
}

export const PAYMENT_METHOD_ICON: Record<string, string> = {
  card: "M3 8h18v10H3V8Zm2 3h4m8-7H7l-2 4h14l-2-4Z",
  pse: "M4 10h16M4 14h10M8 6v12m8-12v12",
  nequi: "M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 4v10",
  llave: "M8 14a4 4 0 1 1 3.5-6H21v3h-2v2h-2v2h-3.5A4 4 0 0 1 8 14Z",
  sandbox: "M12 3 4 7l8 4 8-4-8-4Zm-8 10 8 4 8-4",
};

/**
 * Propósito: True si la URL es el Web Checkout de Wompi (evita open redirect).
 */
export function isAllowedCheckoutUrl(checkoutUrl: string | null): boolean {
  /**
   * Output:
   * @returns boolean — Solo https://checkout.wompi.co/
   */
  return Boolean(checkoutUrl?.startsWith("https://checkout.wompi.co/"));
}
