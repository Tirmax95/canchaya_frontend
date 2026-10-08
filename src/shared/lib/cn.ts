import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Propósito: Combina clases Tailwind sin conflictos de especificidad.
 */
export function cn(...inputs: ClassValue[]): string {
  /**
   * Output:
   * @returns string — className fusionado
   */
  return twMerge(clsx(inputs));
}
