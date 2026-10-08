import { requireSuperAdmin } from "@/core/auth/guards";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { generateInvoices } from "@/data/platform.repository";
import { generateInvoicesSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Super admin emite las facturas de un mes (todos los tenants o los indicados).
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireSuperAdmin();
    const input = parseSchema(generateInvoicesSchema, await readJsonBody(request));
    /**
     * Output:
     * @returns { result } — Facturas emitidas y omitidas
     */
    return { result: await generateInvoices(input) };
  }, "No se pudieron generar las facturas");
}
