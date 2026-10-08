import { requireSuperAdmin } from "@/core/auth/guards";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import { updateOrganizationModules } from "@/data/organization.repository";
import { parseSchema, tenantModulesSchema } from "@/domain/schemas";

/**
 * Propósito: Super admin reemplaza los módulos habilitados de un tenant.
 * El BFF valida rol e input; el backend vuelve a exigir admin y allowlist.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireSuperAdmin();
    const organizationId = parsePositiveIntParam((await context.params).id, "organización");
    const { enabledModules } = parseSchema(tenantModulesSchema, await readJsonBody(request));
    const organization = await updateOrganizationModules(organizationId, enabledModules);
    /**
     * Output:
     * @returns { organization } — Tenant con módulos persistidos
     */
    return { organization };
  }, "No se pudieron guardar los módulos");
}
