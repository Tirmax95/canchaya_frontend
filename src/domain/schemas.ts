import { z } from "zod";
import { AppError } from "@/core/errors/app-error";
import { USER_ROLES } from "@/domain/user";
import { MAX_BOOKING_HOURS, MIN_BOOKING_HOURS } from "@/domain/booking";

const phoneSchema = z
  .string()
  .regex(/^\+\d{7,15}$/, "El teléfono debe ir en formato internacional (+57...)")
  .optional()
  .or(z.literal(""));

export const loginSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const registerSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Ingresa tu nombre").max(80),
  phone: phoneSchema,
  defaultRole: z.enum(USER_ROLES).optional(),
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
  owner_id: z.coerce.number().int().positive(),
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
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type EstablishmentInput = z.infer<typeof establishmentSchema>;
export type FieldInput = z.infer<typeof fieldSchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

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
