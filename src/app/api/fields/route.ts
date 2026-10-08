import { requireStaff } from "@/core/auth/guards";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { createField, listFields } from "@/data/field.repository";
import { fieldSchema, parseSchema } from "@/domain/schemas";

export async function GET() {
  return handleRoute(
    () => listFields().then((fields) => ({ fields })),
    "No se pudieron cargar las canchas",
  );
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
