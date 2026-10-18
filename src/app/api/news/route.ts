import { requireStaff } from "@/core/auth/guards";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { createNewsPost } from "@/data/news.repository";
import { createNewsPostSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Publica una noticia de sede (el backend exige dueño con el módulo `news`).
 */
export async function POST(request: Request) {
  /**
   * Output:
   * @returns NextResponse — { post }
   */
  return handleRoute(async () => {
    await requireStaff();
    const input = parseSchema(createNewsPostSchema, await readJsonBody(request));
    return { post: await createNewsPost(input) };
  }, "No se pudo publicar la noticia");
}
