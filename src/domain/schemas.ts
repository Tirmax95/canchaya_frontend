import { z } from "zod";
import { AppError } from "@/core/errors/app-error";
import { MAX_BOOKING_HOURS, MIN_BOOKING_HOURS } from "@/domain/booking";
import { TENANT_MODULES } from "@/domain/tenant-modules";
import { MAX_COMMISSION_BPS, MAX_MONTHLY_FEE, STATUS_REASON_MAX_LENGTH } from "@/domain/platform";
import {
  getPasswordByteLength,
  getPasswordPolicyViolation,
  PASSWORD_MAX_BYTES,
} from "@/domain/password-policy";

const phoneSchema = z
  .string()
  .regex(/^\+\d{7,15}$/, "El teléfono debe ir en formato internacional (+57...)")
  .optional()
  .or(z.literal(""));

const emailSchema = z.string().trim().email("Ingresa un correo válido");

/** Login no aplica la política nueva: cuentas antiguas pueden tener contraseñas más cortas. */
const currentPasswordSchema = z
  .string()
  .min(1, "Ingresa tu contraseña")
  .refine(
    (password) => getPasswordByteLength(password) <= PASSWORD_MAX_BYTES,
    `La contraseña no puede superar ${PASSWORD_MAX_BYTES} caracteres`,
  );

const newPasswordSchema = z.string().superRefine((password, context) => {
  const violation = getPasswordPolicyViolation(password);
  if (violation) context.addIssue({ code: "custom", message: violation });
});

export const loginSchema = z.object({
  email: emailSchema,
  password: currentPasswordSchema,
});

/** Tokens de un solo uso que llegan por correo (restablecer contraseña, invitaciones). */
export const OPAQUE_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

const opaqueTokenSchema = z
  .string({ error: "El enlace no es válido" })
  .regex(OPAQUE_TOKEN_PATTERN, "El enlace no es válido");

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: opaqueTokenSchema,
    password: newPasswordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirmation"],
  });

/** Código TOTP de 6 dígitos o código de respaldo `xxxxx-xxxxx`. */
export const twoFactorCodeSchema = z.object({
  code: z
    .string({ error: "Escribe el código" })
    .trim()
    .min(6, "Escribe el código de 6 dígitos")
    .max(16, "Código inválido"),
});

export const invitationTokenSchema = z.object({ token: opaqueTokenSchema });

export const inviteMemberSchema = z.object({
  email: emailSchema.max(160),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: newPasswordSchema,
    passwordConfirmation: z.string(),
    fullName: z.string().trim().min(2, "Ingresa tu nombre").max(80),
    phone: phoneSchema,
    isVenueOwner: z.boolean().optional(),
    organizationName: z.string().trim().max(80).optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    if (value.password !== value.passwordConfirmation) {
      context.addIssue({
        code: "custom",
        message: "Las contraseñas no coinciden",
        path: ["passwordConfirmation"],
      });
    }

    if (value.isVenueOwner && !value.organizationName?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Indica el nombre de tu sede o club",
        path: ["organizationName"],
      });
    }
  });

export const profileSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido"),
  fullName: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  phone: phoneSchema,
});

export const establishmentSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(120),
  address: z.string().trim().min(3, "La dirección es obligatoria").max(180),
  phone: z.string().trim().min(6).max(20).optional().or(z.literal("")),
  image_establishment: z
    .string()
    .trim()
    .url("La imagen debe ser una URL http(s)")
    .max(500),
});

export const fieldSchema = z.object({
  id_establishment: z.coerce.number().int().positive(),
  number_field: z.string().trim().min(1, "El número de cancha es obligatorio"),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  base_price_per_hour: z.coerce.number().positive("El precio debe ser mayor a 0"),
  owner_id: z.coerce.number().int().positive().optional(),
  image_fields: z.string().trim().url("La imagen debe ser una URL http(s)").max(500),
});

const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha/hora inválida");

export const createReservationSchema = z
  .object({
    fieldId: z.coerce.number().int().positive(),
    startTime: isoDateSchema,
    endTime: isoDateSchema,
    notes: z.string().trim().max(280).optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    const start = new Date(value.startTime);
    const end = new Date(value.endTime);
    const hours = (end.getTime() - start.getTime()) / 3_600_000;

    if (end <= start) {
      context.addIssue({
        code: "custom",
        message: "La hora de fin debe ser posterior al inicio",
        path: ["endTime"],
      });
    }

    if (start.getTime() <= Date.now()) {
      context.addIssue({
        code: "custom",
        message: "La reserva debe ser en el futuro",
        path: ["startTime"],
      });
    }

    if (hours < MIN_BOOKING_HOURS || hours > MAX_BOOKING_HOURS) {
      context.addIssue({
        code: "custom",
        message: `La reserva debe durar entre ${MIN_BOOKING_HOURS} y ${MAX_BOOKING_HOURS} horas`,
        path: ["endTime"],
      });
    }
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type EstablishmentInput = z.infer<typeof establishmentSchema>;
export type FieldInput = z.infer<typeof fieldSchema>;

const statusReasonSchema = z
  .string({ error: "Escribe un motivo" })
  .trim()
  .min(3, "Escribe un motivo (mínimo 3 caracteres)")
  .max(STATUS_REASON_MAX_LENGTH);

export const tenantActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend"), reason: statusReasonSchema }),
  z.object({ action: z.literal("reactivate") }),
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("billing"),
    monthlyFee: z.coerce.number().int().min(0).max(MAX_MONTHLY_FEE),
    commissionBps: z.coerce.number().int().min(0).max(MAX_COMMISSION_BPS),
    billingEmail: z.string().trim().email("Correo de cobro inválido").max(160).optional().or(z.literal("")),
  }),
]);

export const userActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("block"), reason: statusReasonSchema }),
  z.object({ action: z.literal("unblock") }),
  z.object({ action: z.literal("reset_2fa") }),
]);

const billingPeriodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periodo inválido (YYYY-MM)");

export const generateInvoicesSchema = z.object({
  period: billingPeriodSchema,
  organizationIds: z.array(z.number().int().positive()).max(500).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const invoiceActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("pay"),
    paymentReference: z
      .string({ error: "Indica la referencia del pago" })
      .trim()
      .min(2, "Indica la referencia del pago")
      .max(120),
    paidAt: isoDateSchema.optional(),
  }),
  z.object({ action: z.literal("void"), reason: statusReasonSchema }),
]);

export const tenantModulesSchema = z.object({
  enabledModules: z
    .array(z.enum(TENANT_MODULES))
    .max(TENANT_MODULES.length)
    .refine((modules) => new Set(modules).size === modules.length, "Módulos duplicados"),
});
export const createPickupMatchSchema = z.object({
  sport: z.literal("futbol").default("futbol"),
  venueText: z.string().trim().min(3).max(200),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  startsAt: isoDateSchema,
  totalSlots: z.coerce.number().int().min(2).max(30),
  pricePerSlot: z.coerce.number().int().min(0).max(5_000_000),
  skillLevel: z.enum(["novato", "amateur", "competitivo", "elite"]),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const createRetoSchema = z.object({
  challengedTeamId: z.coerce.number().int().positive(),
  proposedStartsAt: isoDateSchema,
  venueText: z.string().trim().min(3).max(200),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const holdSlotSchema = z.object({
  matchId: z.coerce.number().int().positive(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CreatePickupMatchInput = z.infer<typeof createPickupMatchSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type CreateRetoInput = z.infer<typeof createRetoSchema>;
export type HoldSlotInput = z.infer<typeof holdSlotSchema>;

/**
 * Propósito: Parsea input externo con Zod y lo convierte en AppError de validación.
 */
export function parseSchema<T>(schema: z.ZodType<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload);
  if (parsed.success) {
    /**
     * Output:
     * @returns T — Datos validados y normalizados
     */
    return parsed.data;
  }

  const message = parsed.error.issues[0]?.message ?? "Datos inválidos";
  /**
   * Output:
   * @throws AppError — Primer mensaje de validación, fail-fast
   */
  throw new AppError("VALIDATION", message, 400);
}
