import { getSession } from "@/core/auth/session";
import { handleRoute } from "@/core/http/route";
import { countUnreadConversations } from "@/data/messaging.repository";

/**
 * Propósito: Contador del menú. Sin sesión responde 0 en vez de error.
 */
export async function GET() {
  return handleRoute(
    async () => {
      const session = await getSession();
      /**
       * Output:
       * @returns { unread } — Conversaciones sin leer
       */
      return { unread: session ? await countUnreadConversations() : 0 };
    },
    "No se pudo cargar el contador",
    { skipErrorLog: true },
  );
}
