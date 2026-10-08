import { Spinner } from "@/shared/ui/spinner";

/**
 * Propósito: Fallback de navegación entre rutas.
 */
export default function Loading() {
  return <Spinner label="Cargando CanchaYa…" />;
}
