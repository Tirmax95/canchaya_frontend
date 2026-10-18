/**
 * Noticias de sede. Tipos y reglas puras compartidas por la UI y el BFF.
 * El backend valida todo de nuevo (dueño, módulo `news`, evento del mismo tenant).
 */

export const MAX_NEWS_TITLE_LENGTH = 140;
export const MAX_NEWS_BODY_LENGTH = 4000;

export interface NewsPost {
  postId: number;
  organizationId: number;
  organizationName: string;
  title: string;
  body: string;
  imageUrl: string | null;
  eventId: number | null;
  eventName: string | null;
  publishedAt: string;
}

/** Noticia vista desde el panel del dueño (incluye programadas). */
export interface ManagedNewsPost extends NewsPost {
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Propósito: True si la noticia aún no sale al público (publicación programada).
 */
export function isScheduledNewsPost(post: Pick<NewsPost, "publishedAt">, now: Date = new Date()): boolean {
  /**
   * Output:
   * @returns boolean — Fecha de publicación en el futuro
   */
  return new Date(post.publishedAt).getTime() > now.getTime();
}

/**
 * Propósito: ISO → valor de `<input type="datetime-local">` en la hora local del navegador.
 */
export function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    /**
     * Output:
     * @returns string — Vacío si la fecha no es válida
     */
    return "";
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  /**
   * Output:
   * @returns string — `YYYY-MM-DDTHH:mm`
   */
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
