import { z } from "zod";
import { AppError } from "@/core/errors/app-error";
import {
  BOOKING_CLOSE_HOUR,
  BOOKING_OPEN_HOUR,
  MAX_BOOKING_HOURS,
  MIN_BOOKING_HOURS,
} from "@/domain/booking";
import {
  ESTABLISHMENT_AMENITIES,
  MAX_GALLERY_IMAGES,
  validateOpeningHours,
} from "@/domain/establishment";
import { TENANT_MODULES } from "@/domain/tenant-modules";
import { EVENT_FORMATS, EVENT_LIMITS, EVENT_SPORTS } from "@/domain/events";
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

export const disableTwoFactorSchema = twoFactorCodeSchema.extend({
  currentPassword: z
    .string({ error: "Escribe tu contraseña actual" })
    .min(1, "Escribe tu contraseña actual")
    .max(128),
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
  /** Obligatoria solo si cambia el correo (lo exige el backend para evitar tomas de cuenta). */
  currentPassword: z.string().max(128).optional().or(z.literal("")),
});

/** Imágenes remotas: solo https (sin javascript:, data: ni contenido mixto). */
const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .url("La imagen debe ser una URL https")
  .refine((value) => value.startsWith("https://"), "La imagen debe ser una URL https");

/** Id numérico positivo: nunca se interpola sin validar en una ruta del backend. */
export const positiveIdSchema = z.coerce.number().int().positive().max(2_147_483_647);

const OPENING_HOURS_ERRORS: Record<string, string> = {
  invalidDay: "El horario tiene un día inválido o repetido",
  invalidTime: "Las horas del horario deben tener formato HH:MM",
  invertedRange: "La hora de apertura debe ser anterior al cierre",
};

const openingHoursSchema = z
  .array(
    z.object({
      day: z.number().int().min(0).max(6),
      closed: z.boolean(),
      opens_at: z.string().nullable(),
      closes_at: z.string().nullable(),
    }),
  )
  .max(7)
  .superRefine((hours, context) => {
    const errorKey = validateOpeningHours(
      hours.map((entry) => ({
        day: entry.day,
        closed: entry.closed,
        opensAt: entry.opens_at,
        closesAt: entry.closes_at,
      })),
    );
    if (errorKey) {
      context.addIssue({ code: "custom", message: OPENING_HOURS_ERRORS[errorKey] ?? errorKey });
    }
  });

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const establishmentSchema = z
  .object({
    name: z.string().trim().min(2, "El nombre es obligatorio").max(120),
    address: z.string().trim().min(3, "La dirección es obligatoria").max(180),
    phone: z.string().trim().min(6).max(20).optional().or(z.literal("")),
    image_establishment: imageUrlSchema,
    description: optionalText(1000),
    city: optionalText(80),
    latitude: z.number().min(-90).max(90).nullable().optional().default(null),
    longitude: z.number().min(-180).max(180).nullable().optional().default(null),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(160)
      .email("Correo de contacto inválido")
      .optional()
      .or(z.literal(""))
      .default(""),
    whatsapp: z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s()-]/g, ""))
      .refine((value) => value === "" || /^\+?\d{7,15}$/.test(value), "WhatsApp debe tener entre 7 y 15 dígitos")
      .optional()
      .default(""),
    website: z
      .string()
      .trim()
      .max(300)
      .refine(
        (value) => value === "" || /^https:\/\/[^\s]+$/.test(value),
        "El sitio web debe ser una URL https",
      )
      .optional()
      .default(""),
    instagram: z
      .string()
      .trim()
      .transform((value) => value.replace(/^@/, ""))
      .refine((value) => value === "" || /^[A-Za-z0-9._]{1,30}$/.test(value), "Usuario de Instagram inválido")
      .optional()
      .default(""),
    opening_hours: openingHoursSchema.optional().default([]),
    amenities: z.array(z.enum(ESTABLISHMENT_AMENITIES)).max(ESTABLISHMENT_AMENITIES.length).optional().default([]),
    gallery_images: z
      .array(imageUrlSchema)
      .max(MAX_GALLERY_IMAGES, `Máximo ${MAX_GALLERY_IMAGES} fotos en la galería`)
      .optional()
      .default([])
      .transform((urls) => [...new Set(urls)]),
    policies: optionalText(1000),
    is_active: z.boolean().optional().default(true),
  })
  .refine(
    (input) => (input.latitude === null) === (input.longitude === null),
    { message: "Latitud y longitud deben enviarse juntas", path: ["latitude"] },
  );

/** Búsqueda por texto o dirección inversa por coordenadas, nunca ambas vacías. */
export const geocodeQuerySchema = z
  .object({
    q: z.string().trim().min(3, "Escribe al menos 3 caracteres").max(200).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine(
    (input) => Boolean(input.q) || (input.lat !== undefined && input.lng !== undefined),
    { message: "Indica una dirección o un punto del mapa" },
  );

export const fieldSchema = z.object({
  id_establishment: z.coerce.number().int().positive(),
  number_field: z.string().trim().min(1, "El número de cancha es obligatorio").max(40),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  base_price_per_hour: z.coerce
    .number()
    .int("El precio debe ser un valor entero")
    .positive("El precio debe ser mayor a 0")
    .max(50_000_000, "El precio es demasiado alto"),
  owner_id: z.coerce.number().int().positive().optional(),
  image_fields: imageUrlSchema,
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

    // Franjas en punto: evita reservas desalineadas que bloquean dos franjas pagando una.
    if (start.getTime() % 3_600_000 !== 0 || end.getTime() % 3_600_000 !== 0) {
      context.addIssue({
        code: "custom",
        message: "La reserva debe empezar y terminar en punto",
        path: ["startTime"],
      });
      return;
    }

    // Colombia es UTC-5 fijo: hora local = hora UTC - 5.
    const localStartHour = (start.getUTCHours() + 24 - 5) % 24;
    const localEndHour = localStartHour + hours;
    if (localStartHour < BOOKING_OPEN_HOUR || localEndHour > BOOKING_CLOSE_HOUR) {
      context.addIssue({
        code: "custom",
        message: `Solo se puede reservar entre las 0${BOOKING_OPEN_HOUR}:00 y las ${BOOKING_CLOSE_HOUR}:00`,
        path: ["startTime"],
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
  z.object({
    action: z.literal("online_payments"),
    isEnabled: z.boolean(),
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

export const teamActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("invite"), teamId: positiveIdSchema, userId: positiveIdSchema }),
  z.object({ action: z.enum(["accept", "decline"]), inviteId: positiveIdSchema }),
]);

export const retoActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
  retoId: positiveIdSchema,
});

export const pickupApproveSchema = z.object({
  action: z.literal("approve"),
  paymentId: positiveIdSchema,
});

export const pickupCheckoutSchema = z.object({
  matchId: positiveIdSchema,
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

const civilDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Fecha inválida");

const eventSettingsSchema = z
  .object({
    points_win: z.number().int().min(0).max(10),
    points_draw: z.number().int().min(0).max(10),
    points_loss: z.number().int().min(0).max(10),
    double_round: z.boolean(),
    group_count: z.number().int().min(1).max(EVENT_LIMITS.maxGroups),
    qualifiers_per_group: z.number().int().min(1).max(8),
    third_place_match: z.boolean(),
    match_duration_minutes: z
      .number()
      .int()
      .min(EVENT_LIMITS.minMatchMinutes)
      .max(EVENT_LIMITS.maxMatchMinutes),
  })
  .partial();

/** Campos del evento (contrato snake_case de NestJS). En la edición todo es opcional. */
export const eventInputSchema = z
  .object({
    establishment_id: z.number().int().positive(),
    name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(120),
    description: z.string().trim().max(4000),
    sport: z.enum(EVENT_SPORTS),
    format: z.enum(EVENT_FORMATS),
    starts_on: civilDateSchema,
    ends_on: civilDateSchema.nullable(),
    registration_closes_at: isoDateSchema.nullable(),
    min_teams: z.number().int().min(EVENT_LIMITS.minTeams).max(EVENT_LIMITS.maxTeams),
    max_teams: z.number().int().min(EVENT_LIMITS.minTeams).max(EVENT_LIMITS.maxTeams),
    min_players_per_team: z.number().int().min(1).max(EVENT_LIMITS.maxPlayersPerTeam),
    max_players_per_team: z.number().int().min(1).max(EVENT_LIMITS.maxPlayersPerTeam).nullable(),
    entry_fee: z
      .number()
      .int("El valor debe ser un número entero")
      .min(0)
      .max(EVENT_LIMITS.maxEntryFeePesos, "El valor es demasiado alto"),
    requires_approval: z.boolean(),
    settings: eventSettingsSchema,
    prizes: z.string().trim().max(2000),
    rules: z.string().trim().max(4000),
    cover_image: z.union([z.literal(""), imageUrlSchema]),
  })
  .partial();

export const createEventSchema = eventInputSchema.required({
  establishment_id: true,
  name: true,
  sport: true,
  format: true,
  starts_on: true,
  max_teams: true,
});

export const eventActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish") }),
  z.object({ action: z.literal("close_registration") }),
  z.object({ action: z.literal("reopen_registration") }),
  z.object({ action: z.literal("start"), randomize: z.boolean().optional() }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("cancel"), reason: statusReasonSchema }),
  z.object({ action: z.literal("regenerate_fixture"), randomize: z.boolean().optional() }),
  z.object({ action: z.literal("generate_knockout") }),
]);
export type EventActionInput = z.infer<typeof eventActionSchema>;

export const registerTeamSchema = z.object({
  team_id: z.number().int().positive("Elige un equipo"),
  notes: z.string().trim().max(300).optional(),
});

export const manageRegistrationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: statusReasonSchema }),
  z.object({ action: z.literal("mark_paid") }),
  z.object({ action: z.literal("mark_refunded") }),
  z.object({
    action: z.literal("set_seed"),
    seed: z.number().int().min(1).max(EVENT_LIMITS.maxTeams).nullable(),
  }),
]);
export type ManageRegistrationInput = z.infer<typeof manageRegistrationSchema>;

const scoreSchema = z.number().int().min(0).max(EVENT_LIMITS.maxScore);

export const matchUpdateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("schedule"),
    field_id: z.number().int().positive("Elige una cancha"),
    starts_at: isoDateSchema,
    duration_minutes: z
      .number()
      .int()
      .min(EVENT_LIMITS.minMatchMinutes)
      .max(EVENT_LIMITS.maxMatchMinutes)
      .optional(),
    notes: z.string().trim().max(300).optional(),
  }),
  z.object({
    kind: z.literal("result"),
    home_score: scoreSchema,
    away_score: scoreSchema,
    home_penalties: scoreSchema.nullable().optional(),
    away_penalties: scoreSchema.nullable().optional(),
    walkover: z.boolean().optional(),
    notes: z.string().trim().max(300).optional(),
  }),
]);
export type MatchUpdateInput = z.infer<typeof matchUpdateSchema>;

export const registrationActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("withdraw") }),
  z.object({ action: z.literal("checkout"), method_id: z.number().int().positive() }),
  z.object({ action: z.literal("confirm_local") }),
]);
export type RegistrationActionInput = z.infer<typeof registrationActionSchema>;

export const eventListQuerySchema = z.object({
  status: z.enum(["registration_open", "registration_closed", "in_progress", "completed"]).optional(),
  sport: z.enum(EVENT_SPORTS).optional(),
  city: z.string().trim().max(80).optional(),
  include_past: z.enum(["true", "false"]).optional(),
});
export type EventListQuery = z.infer<typeof eventListQuerySchema>;
