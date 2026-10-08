import { requireStaff } from "@/core/auth/guards";
import { AppError } from "@/core/errors/app-error";
import { handleRoute, readJsonBody } from "@/core/http/route";
import {
  deleteEstablishment,
  getEstablishmentById,
  updateEstablishment,
} from "@/data/establishment.repository";
import { establishmentSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Parsea el id de ruta y falla rápido si no es entero positivo.
 */
function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("VALIDATION", "Identificador de sede inválido", 400);
  }
  return id;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const establishment = await getEstablishmentById(
      parseId((await context.params).id),
    );
    return { establishment };
  }, "No se pudo cargar la sede");
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireStaff();
    const input = parseSchema(establishmentSchema, await readJsonBody(request));
    const establishment = await updateEstablishment(
      parseId((await context.params).id),
      input,
    );
    return { establishment };
  }, "No se pudo actualizar la sede");
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireStaff();
    await deleteEstablishment(parseId((await context.params).id));
    return { ok: true };
  }, "No se pudo eliminar la sede");
}
