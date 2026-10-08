export const USER_ROLES = [
  "admin",
  "client",
  "establishment_owner",
  "manager",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface PublicUser {
  id: number;
  email: string;
  fullName?: string;
  phone?: string;
  roles: UserRole[];
}

export interface SessionUser extends PublicUser {
  sessionId: string;
}

export const STAFF_ROLES: readonly UserRole[] = [
  "admin",
  "establishment_owner",
  "manager",
];
