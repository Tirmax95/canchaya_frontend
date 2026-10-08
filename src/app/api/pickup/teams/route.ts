import { requireSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import {
  createTeam,
  inviteToTeam,
  listMyTeams,
  listTeamInvites,
  respondInvite,
  searchTeams,
  searchUserByPhone,
} from "@/data/pickup.repository";
import { createTeamSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Lista equipos, invitaciones o búsqueda. Siempre con sesión.
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireSession();
    const url = new URL(request.url);
    const view = url.searchParams.get("view");
    if (view === "invites") {
      return { invites: await listTeamInvites() };
    }
    if (view === "search") {
      return { teams: await searchTeams(url.searchParams.get("q") ?? "") };
    }
    if (view === "user") {
      return {
        user: await searchUserByPhone(url.searchParams.get("phone") ?? ""),
      };
    }
    return { teams: await listMyTeams() };
  }, "No se pudieron cargar los equipos");
}

/**
 * Propósito: Crea equipo, invita o responde invitación.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireSession();
    const body = (await readJsonBody(request)) as {
      action?: string;
      name?: string;
      teamId?: number;
      userId?: number;
      inviteId?: number;
    };
    if (body.action === "invite" && body.teamId && body.userId) {
      return { invite: await inviteToTeam(body.teamId, body.userId) };
    }
    if (body.action === "accept" && body.inviteId) {
      return { invite: await respondInvite(body.inviteId, true) };
    }
    if (body.action === "decline" && body.inviteId) {
      return { invite: await respondInvite(body.inviteId, false) };
    }
    const input = parseSchema(createTeamSchema, body);
    return { team: await createTeam(input.name) };
  }, "No se pudo completar la acción de equipo");
}
