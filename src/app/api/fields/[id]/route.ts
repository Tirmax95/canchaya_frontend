import { requireStaff } from "@/core/auth/guards";
import { AppError } from "@/core/errors/app-error";
import { handleRoute, readJsonBody } from "@/core/http/route";
import {
  deleteField,
  getFieldById,
  updateField,
} from "@/data/field.repository";
import { fieldSchema, parseSchema } from "@/domain/schemas";

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("VALIDATION", "Identificador de cancha inválido", 400);
  }
  return id;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const field = await getFieldById(parseId((await context.params).id));
    return { field };
  }, "No se pudo cargar la cancha");
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const session = await requireStaff();
    const input = parseSchema(fieldSchema, {
      ...(await readJsonBody(request) as object),
      owner_id: session.id,
    });
    const field = await updateField(parseId((await context.params).id), input);
    return { field };
  }, "No se pudo actualizar la cancha");
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireStaff();
    await deleteField(parseId((await context.params).id));
    return { ok: true };
  }, "No se pudo eliminar la cancha");
}
