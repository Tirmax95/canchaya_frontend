import { shouldSeeOnlyOwnedVenues } from "@/core/auth/roles";
import { requireStaff } from "@/core/auth/guards";
import { getSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import {
  createField,
  listFields,
  listManagedFields,
} from "@/data/field.repository";
import { fieldSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Lista canchas visibles. Dueño solo las suyas; el resto el marketplace.
 */
export async function GET() {
  return handleRoute(async () => {
    const session = await getSession();
    const fields = shouldSeeOnlyOwnedVenues(session)
      ? await listManagedFields()
      : await listFields();
    return { fields };
  }, "No se pudieron cargar las canchas");
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await requireStaff();
    const input = parseSchema(fieldSchema, {
      ...(await readJsonBody(request) as object),
      owner_id: session.id,
    });
    const field = await createField(input);
    return { field };
  }, "No se pudo crear la cancha");
}
