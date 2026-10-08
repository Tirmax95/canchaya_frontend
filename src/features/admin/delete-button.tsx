"use client";

import { Button } from "@/shared/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Elimina un recurso admin con confirmación nativa del navegador.
 */
export function DeleteButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Propósito: DELETE al BFF y refresca la tabla.
   */
  async function handleDelete() {
    if (!window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) {
      return;
    }
    setIsDeleting(true);
    const response = await fetch(href, { method: "DELETE" });
    if (response.ok || response.status === 204) {
      router.refresh();
    }
    setIsDeleting(false);
  }

  /**
   * Output:
   * @returns JSX.Element — Botón destructivo
   */
  return (
    <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
      Eliminar
    </Button>
  );
}
