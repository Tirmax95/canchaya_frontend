export type CsvCell = string | number | null | undefined;

const FORMULA_TRIGGER_PATTERN = /^[=+\-@\t\r]/;

/**
 * Propósito: Escapa una celda CSV (RFC 4180) y neutraliza inyección de fórmulas en hojas
 * de cálculo anteponiendo `'` a textos que empiezan por =, +, -, @, tab o CR.
 */
function escapeCsvCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) {
    /**
     * Output:
     * @returns string — Celda vacía
     */
    return "";
  }
  if (typeof cell === "number") {
    /**
     * Output:
     * @returns string — Número sin comillas
     */
    return Number.isFinite(cell) ? String(cell) : "";
  }
  const safeText = FORMULA_TRIGGER_PATTERN.test(cell) ? `'${cell}` : cell;
  /**
   * Output:
   * @returns string — Texto entre comillas con comillas internas duplicadas
   */
  return `"${safeText.replace(/"/g, '""')}"`;
}

/**
 * Propósito: Serializa encabezados + filas a CSV con BOM UTF-8 (Excel respeta las tildes).
 */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  /**
   * Output:
   * @returns string — Documento CSV con saltos CRLF
   */
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
