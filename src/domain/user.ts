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

export interface SessionUser extends PublicUser {
  sessionId: string;
  /** Super admin sin 2FA: debe activarlo antes de usar el panel de plataforma. */
  twoFactorSetupRequired?: boolean;
  /** Sesión "ver como tenant" abierta por el super admin: solo lectura. */
  isReadOnly?: boolean;
}

export const STAFF_ROLES: readonly UserRole[] = [
  "admin",
  "establishment_owner",
  "manager",
];
