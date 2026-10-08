import { AppError } from "@/core/errors/app-error";
import type { Establishment } from "@/domain/establishment";
import type { Field } from "@/domain/field";
import type { Reservation, ReservationStatus } from "@/domain/reservation";
import { RESERVATION_STATUSES } from "@/domain/reservation";
import type { PublicUser, UserRole } from "@/domain/user";
import { USER_ROLES } from "@/domain/user";

interface RawUser {
  id?: unknown;
  email?: unknown;
  fullName?: unknown;
  phone?: unknown;
  passwordHash?: unknown;
}

interface RawEstablishment {
  establishmentId?: unknown;
  name?: unknown;
  address?: unknown;
  phone?: unknown;
  imageEstablishment?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface RawField {
  id?: unknown;
  establishmentId?: unknown;
  numberField?: unknown;
  description?: unknown;
  basePricePerHour?: unknown;
  ownerId?: unknown;
  imageFields?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface RawReservation {
  reservationId?: unknown;
  userId?: unknown;
  fieldId?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  status?: unknown;
  notes?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Propósito: Convierte un número o string numérico en entero positivo.
 */
function toPositiveInt(value: unknown, fieldName: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    /**
     * Output:
     * @throws AppError — El backend devolvió un id inválido
     */
    throw new AppError("UPSTREAM", `Identificador inválido: ${fieldName}`, 502);
  }

  /**
   * Output:
   * @returns number — Entero positivo
   */
  return parsed;
}

/**
 * Propósito: Normaliza fechas Date/string del backend a ISO.
 */
function toIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.length > 0) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  /**
   * Output:
   * @throws AppError — Fecha no parseable
   */
  throw new AppError("UPSTREAM", "El backend devolvió una fecha inválida", 502);
}

/**
 * Propósito: Quita passwordHash y expone solo campos públicos del usuario.
 */
export function toPublicUser(raw: RawUser, roles: UserRole[] = []): PublicUser {
  if (typeof raw.email !== "string") {
    /**
     * Output:
     * @throws AppError — Usuario sin email usable
     */
    throw new AppError("UPSTREAM", "El usuario no tiene un email válido", 502);
  }

  /**
   * Output:
   * @returns PublicUser — Perfil sin secretos
   *   - id, email, fullName, phone, roles
   */
  return {
    id: toPositiveInt(raw.id, "user.id"),
    email: raw.email,
    fullName: typeof raw.fullName === "string" ? raw.fullName : undefined,
    phone: typeof raw.phone === "string" ? raw.phone : undefined,
    roles,
  };
}

/**
 * Propósito: Filtra roles desconocidos para no persistir valores arbitrarios.
 */
export function toUserRoles(rawRoles: unknown): UserRole[] {
  if (!Array.isArray(rawRoles)) {
    /**
     * Output:
     * @returns UserRole[] — Lista vacía si el backend no envió roles
     */
    return [];
  }

  /**
   * Output:
   * @returns UserRole[] — Roles allowlisteados
   */
  return rawRoles.filter((role): role is UserRole =>
    USER_ROLES.includes(role as UserRole),
  );
}

/**
 * Propósito: Mapea un establecimiento del backend al modelo de dominio.
 */
export function toEstablishment(raw: RawEstablishment): Establishment {
  /**
   * Output:
   * @returns Establishment — Sede normalizada
   */
  return {
    establishmentId: toPositiveInt(raw.establishmentId, "establishmentId"),
    name: typeof raw.name === "string" ? raw.name : "Establecimiento",
    address: typeof raw.address === "string" ? raw.address : "",
    phone: typeof raw.phone === "string" ? raw.phone : "",
    imageEstablishment:
      typeof raw.imageEstablishment === "string" ? raw.imageEstablishment : "",
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

/**
 * Propósito: Mapea una cancha del backend al modelo de dominio.
 */
export function toField(raw: RawField): Field {
  /**
   * Output:
   * @returns Field — Cancha normalizada
   */
  return {
    id: toPositiveInt(raw.id, "field.id"),
    establishmentId: toPositiveInt(raw.establishmentId, "field.establishmentId"),
    numberField: typeof raw.numberField === "string" ? raw.numberField : "Cancha",
    description: typeof raw.description === "string" ? raw.description : "",
    basePricePerHour: Number(raw.basePricePerHour) || 0,
    ownerId: toPositiveInt(raw.ownerId, "field.ownerId"),
    imageFields: typeof raw.imageFields === "string" ? raw.imageFields : "",
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

/**
 * Propósito: Mapea una reserva y descarta estados desconocidos.
 */
export function toReservation(raw: RawReservation): Reservation {
  const status = RESERVATION_STATUSES.includes(raw.status as ReservationStatus)
    ? (raw.status as ReservationStatus)
    : "pending";

  /**
   * Output:
   * @returns Reservation — Reserva normalizada
   */
  return {
    reservationId: toPositiveInt(raw.reservationId, "reservationId"),
    userId: toPositiveInt(raw.userId, "reservation.userId"),
    fieldId: toPositiveInt(raw.fieldId, "reservation.fieldId"),
    startTime: toIso(raw.startTime),
    endTime: toIso(raw.endTime),
    status,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}
