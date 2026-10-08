export const MATCH_STATUSES = [
  "draft",
  "open",
  "filled",
  "confirmed",
  "played",
  "result_pending",
  "closed",
  "cancelled",
  "disputed",
] as const;

export type MatchStatus = (typeof MATCH_STATUSES)[number];

export interface PickupMatch {
  id: number;
  organizerId: number;
  sport: string;
  venueText: string;
  lat: number;
  lng: number;
  startsAt: string;
  totalSlots: number;
  slotsTaken: number;
  slotsLeft: number;
  pricePerSlot: number;
  skillLevel: string;
  status: MatchStatus;
  createdAt: string;
  distanceMeters?: number;
  urgent?: boolean;
}

export interface PickupSlot {
  id: number;
  matchId: number;
  userId: number;
  status: "held" | "paid" | "released" | "refunded";
  heldUntil: string | null;
  createdAt: string;
}

export interface PickupCheckout {
  slot: PickupSlot;
  match: PickupMatch;
  checkout: {
    provider: string;
    checkoutUrl: string;
    amount: number;
    expiresAt: string | null;
  };
}

export interface PickupPayment {
  id: number;
  userId: number;
  matchSlotId: number;
  matchId: number;
  provider: string;
  amount: number;
  status: "pending" | "approved" | "declined" | "refunded";
  checkoutUrl: string;
  createdAt: string;
}

export interface PickupTeamMember {
  teamId: number;
  userId: number;
  role: "captain" | "player";
  joinedAt: string;
  name: string | null;
}

export interface PickupTeam {
  id: number;
  name: string;
  captainId: number;
  createdAt: string;
  members: PickupTeamMember[];
}

export interface PickupInvite {
  id: number;
  teamId: number;
  userId: number;
  status: "pending" | "accepted" | "declined";
  teamName: string | null;
  createdAt: string;
  respondedAt: string | null;
}

export interface PickupReto {
  id: number;
  challengerTeamId: number;
  challengedTeamId: number;
  challengerTeamName: string | null;
  challengedTeamName: string | null;
  status: "pending" | "accepted" | "declined";
  proposedStartsAt: string;
  venueText: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  resolvedAt: string | null;
  matchId: number | null;
}

export interface PickupNotification {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface GamificationSummary {
  userId: number;
  xp: number;
  level: number;
  levelBadge: string;
  currentStreakWeeks: number;
  bestStreakWeeks: number;
  attendanceCount: number;
  badges: Array<{
    code: string;
    name: string;
    description: string;
    earnedAt: string;
  }>;
}

export const BOGOTA = { lat: 4.60971, lng: -74.08175 };
