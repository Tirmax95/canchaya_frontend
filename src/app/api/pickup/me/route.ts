import { requireSession } from "@/core/auth/session";
import { handleRoute } from "@/core/http/route";
import {
  getMyGamification,
  getMyLedger,
  getMyNotifications,
  markAllNotificationsRead,
} from "@/data/pickup.repository";

/**
 * Propósito: Perfil de XP, ledger y bandeja del actor autenticado.
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireSession();
    const view = new URL(request.url).searchParams.get("view");
    if (view === "ledger") {
      return getMyLedger();
    }
    if (view === "notifications") {
      return getMyNotifications();
    }
    return getMyGamification();
  }, "No se pudo cargar tu perfil de juego");
}

/**
 * Propósito: Marca todas las notificaciones del actor como leídas.
 */
export async function POST() {
  return handleRoute(async () => {
    await requireSession();
    return markAllNotificationsRead();
  }, "No se pudieron marcar las notificaciones");
}
