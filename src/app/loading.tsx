import { getTranslator } from "@/core/i18n/get-locale";
import { Spinner } from "@/shared/ui/spinner";

/**
 * Propósito: Fallback de navegación entre rutas.
 */
export default async function Loading() {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns JSX.Element — Spinner con copy localizado
   */
  return <Spinner label={t("common.loadingApp")} />;
}
