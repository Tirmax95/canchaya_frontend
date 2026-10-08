import { shouldSeeOnlyOwnedVenues } from "@/core/auth/roles";
import { requireStaff } from "@/core/auth/guards";
import { getSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import {
  createEstablishment,
  listEstablishments,
  listManagedEstablishments,
} from "@/data/establishment.repository";
import { establishmentSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Lista sedes visibles. Dueño solo las suyas; el resto el marketplace.
 */
export async function GET() {
  return handleRoute(async () => {
    const session = await getSession();
    const establishments = shouldSeeOnlyOwnedVenues(session)
      ? await listManagedEstablishments()
      : await listEstablishments();
    return { establishments };
  }, "No se pudieron cargar las sedes");
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireStaff();
    const input = parseSchema(establishmentSchema, await readJsonBody(request));
    const establishment = await createEstablishment(input);
    return { establishment };
  }, "No se pudo crear la sede");
}
