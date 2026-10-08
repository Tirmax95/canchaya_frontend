import { requireStaff } from "@/core/auth/guards";
import { handleRoute, readJsonBody } from "@/core/http/route";
import {
  createEstablishment,
  listEstablishments,
} from "@/data/establishment.repository";
import { establishmentSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Lista sedes (público) o crea una sede (solo staff).
 */
export async function GET() {
  return handleRoute(
    () => listEstablishments().then((establishments) => ({ establishments })),
    "No se pudieron cargar las sedes",
  );
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireStaff();
    const input = parseSchema(establishmentSchema, await readJsonBody(request));
    const establishment = await createEstablishment(input);
    return { establishment };
  }, "No se pudo crear la sede");
}
