export const USER_ROLES = [
  "admin",
  "client",
  "establishment_owner",
  "manager",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface PublicOrganization {
  id: number;
  name: string;
  slug: string;
  role: "owner" | "manager";
}

export interface PublicUser {
  id: number;
  email: string;
  fullName?: string;
  phone?: string;
  roles: UserRole[];
  organizations?: PublicOrganization[];
}

/**
 * Usuario que puede llegar al navegador (props de componentes cliente, JSON de /api).
 * Nunca incluye `sessionId`: ese token autentica contra NestJS y debe quedarse en el servidor.
 */
export interface ClientSessionUser extends PublicUser {
  /** Super admin sin 2FA: debe activarlo antes de usar el panel de plataforma. */
  twoFactorSetupRequired?: boolean;
  /** Sesión "ver como tenant" abierta por el super admin: solo lectura. */
  isReadOnly?: boolean;
  /** Nunca: así TypeScript rechaza pasar un SessionUser a un componente cliente. */
  sessionId?: never;
}

export interface SessionUser extends PublicUser {
  twoFactorSetupRequired?: boolean;
  isReadOnly?: boolean;
  sessionId: string;
}

export const STAFF_ROLES: readonly UserRole[] = [
  "admin",
  "establishment_owner",
  "manager",
];
