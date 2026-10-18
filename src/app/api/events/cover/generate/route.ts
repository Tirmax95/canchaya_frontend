import { requireSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { generateEventCover } from "@/data/event.repository";
import { generateEventCoverSchema, parseSchema } from "@/domain/schemas";

/** Generar con IA puede tardar: Next no debe cortar la ruta antes que el backend. */
export const maxDuration = 120;

/**
 * Propósito: Genera una portada con IA a partir de los datos del evento (sede, nombre,
 * deporte, formato). Permisos, tope de uso y proveedor los decide el backend.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireSession();
    const input = parseSchema(generateEventCoverSchema, await readJsonBody(request));
    /**
     * Output:
     * @returns { coverImage, isSimulated } — Portada lista para precargar en el formulario
     */
    return await generateEventCover(input);
  }, "No se pudo generar la imagen");
}
