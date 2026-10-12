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
import { createTeamSchema, parseSchema, teamActionSchema } from "@/domain/schemas";

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
      return { teams: await searchTeams((url.searchParams.get("q") ?? "").trim().slice(0, 80)) };
    }
    if (view === "user") {
      return {
        user: await searchUserByPhone((url.searchParams.get("phone") ?? "").trim().slice(0, 20)),
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
    const body = await readJsonBody(request);
    if (body && typeof body === "object" && "action" in body) {
      const action = parseSchema(teamActionSchema, body);
      if (action.action === "invite") {
        return { invite: await inviteToTeam(action.teamId, action.userId) };
      }
      return { invite: await respondInvite(action.inviteId, action.action === "accept") };
    }
    const input = parseSchema(createTeamSchema, body);
    return { team: await createTeam(input.name) };
  }, "No se pudo completar la acción de equipo");
}
