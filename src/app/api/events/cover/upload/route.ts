import { requireSession } from "@/core/auth/session";
import { AppError } from "@/core/errors/app-error";
import { handleRoute } from "@/core/http/route";
import { uploadEventCover } from "@/data/event.repository";
import { MAX_COVER_UPLOAD_BYTES, COVER_UPLOAD_TYPES } from "@/domain/events";
import { positiveIdSchema } from "@/domain/schemas";

/**
 * Propósito: Sube una portada (PNG, JPG o WebP, máx. 5 MB). Aquí se descarta lo obvio; el
 * backend revisa los bytes reales del archivo, los permisos y el tope de subidas.
 * El middleware ya rechaza el POST si viene de otro sitio (CSRF).
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireSession();
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    const establishmentId = positiveIdSchema.safeParse(formData?.get("establishmentId"));
    if (!establishmentId.success) {
      /**
       * Output:
       * @throws AppError — Falta la sede
       */
      throw new AppError("VALIDATION", "Elige la sede del evento", 400);
    }
    if (!(file instanceof File) || file.size === 0) {
      throw new AppError("VALIDATION", "Selecciona una imagen", 400);
    }
    if (file.size > MAX_COVER_UPLOAD_BYTES) {
      throw new AppError("VALIDATION", "La imagen no puede pesar más de 5 MB", 400);
    }
    if (!COVER_UPLOAD_TYPES.includes(file.type)) {
      throw new AppError("VALIDATION", "La imagen debe ser PNG, JPG o WebP", 400);
    }
    /**
     * Output:
     * @returns { coverImage, isSimulated } — Portada subida
     */
    return await uploadEventCover(establishmentId.data, file);
  }, "No se pudo subir la imagen");
}
