import { requireStaff } from "@/core/auth/guards";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import { deleteNewsPost, updateNewsPost } from "@/data/news.repository";
import { parseSchema, updateNewsPostSchema } from "@/domain/schemas";

/**
 * Propósito: Edita una noticia propia.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  /**
   * Output:
   * @returns NextResponse — { post }
   */
  return handleRoute(async () => {
    await requireStaff();
    const postId = parsePositiveIntParam((await context.params).id, "noticia");
    const input = parseSchema(updateNewsPostSchema, await readJsonBody(request));
    return { post: await updateNewsPost(postId, input) };
  }, "No se pudo guardar la noticia");
}

/**
 * Propósito: Borra una noticia propia.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  /**
   * Output:
   * @returns NextResponse — { ok }
   */
  return handleRoute(async () => {
    await requireStaff();
    await deleteNewsPost(parsePositiveIntParam((await context.params).id, "noticia"));
    return { ok: true };
  }, "No se pudo borrar la noticia");
}
