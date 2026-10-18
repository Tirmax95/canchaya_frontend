import { requestAuthedBackend, requestBackend } from "@/core/http/backend-client";
import type { ManagedNewsPost, NewsPost } from "@/domain/news";
import type { CreateNewsPostInput, UpdateNewsPostInput } from "@/domain/schemas";

interface BackendNewsPost {
  post_id?: unknown;
  organization_id?: unknown;
  organization_name?: unknown;
  title?: unknown;
  body?: unknown;
  image_url?: unknown;
  event_id?: unknown;
  event_name?: unknown;
  published_at?: unknown;
  author_name?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
}

export interface NewsFeedPage {
  posts: NewsPost[];
  page: number;
  hasMore: boolean;
}

/**
 * Propósito: Texto opcional del backend (vacío cuenta como ausente).
 */
function optionalText(value: unknown): string | null {
  /**
   * Output:
   * @returns string | null — Texto o null
   */
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Propósito: Noticia snake_case del backend → modelo de la web.
 */
function toNewsPost(raw: BackendNewsPost): NewsPost {
  /**
   * Output:
   * @returns NewsPost — Noticia pública
   */
  return {
    postId: Number(raw.post_id),
    organizationId: Number(raw.organization_id),
    organizationName: String(raw.organization_name ?? ""),
    title: String(raw.title ?? ""),
    body: String(raw.body ?? ""),
    imageUrl: optionalText(raw.image_url),
    eventId: typeof raw.event_id === "number" ? raw.event_id : null,
    eventName: optionalText(raw.event_name),
    publishedAt: String(raw.published_at ?? ""),
  };
}

/**
 * Propósito: Noticia del panel (con autor y fechas de edición).
 */
function toManagedNewsPost(raw: BackendNewsPost): ManagedNewsPost {
  /**
   * Output:
   * @returns ManagedNewsPost — Noticia administrable
   */
  return {
    ...toNewsPost(raw),
    authorName: optionalText(raw.author_name),
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
  };
}

/**
 * Propósito: Arreglo de noticias seguro aunque el backend omita la clave.
 */
function asPostArray(value: unknown): BackendNewsPost[] {
  /**
   * Output:
   * @returns BackendNewsPost[] — Lista o vacío
   */
  return Array.isArray(value) ? (value as BackendNewsPost[]) : [];
}

/**
 * Propósito: Feed público de noticias (publicadas, de tenants activos).
 */
export async function listPublicNews(
  options: { organizationId?: number; page?: number; limit?: number } = {},
): Promise<NewsFeedPage> {
  const query = new URLSearchParams();
  if (options.organizationId) query.set("organization_id", String(options.organizationId));
  if (options.page) query.set("page", String(options.page));
  if (options.limit) query.set("limit", String(options.limit));
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const payload = await requestBackend<{ posts?: unknown; page?: unknown; has_more?: unknown }>({
    path: `/news${suffix}`,
  });
  /**
   * Output:
   * @returns NewsFeedPage — Página del feed
   */
  return {
    posts: asPostArray(payload.posts).map(toNewsPost),
    page: Number(payload.page ?? 1),
    hasMore: payload.has_more === true,
  };
}

/**
 * Propósito: Noticias de los tenants del dueño, incluidas las programadas.
 */
export async function listManagedNews(): Promise<ManagedNewsPost[]> {
  const payload = await requestAuthedBackend<{ posts?: unknown }>({ path: "/news/manage/mine" });
  /**
   * Output:
   * @returns ManagedNewsPost[] — Noticias administrables
   */
  return asPostArray(payload.posts).map(toManagedNewsPost);
}

/**
 * Propósito: Publica (o programa) una noticia.
 */
export async function createNewsPost(input: CreateNewsPostInput): Promise<ManagedNewsPost> {
  const payload = await requestAuthedBackend<{ post?: BackendNewsPost }>({
    path: "/news",
    method: "POST",
    body: input,
  });
  /**
   * Output:
   * @returns ManagedNewsPost — Noticia creada
   */
  return toManagedNewsPost(payload.post ?? {});
}

/**
 * Propósito: Edita una noticia propia.
 */
export async function updateNewsPost(postId: number, input: UpdateNewsPostInput): Promise<ManagedNewsPost> {
  const payload = await requestAuthedBackend<{ post?: BackendNewsPost }>({
    path: `/news/${postId}`,
    method: "PUT",
    body: input,
  });
  /**
   * Output:
   * @returns ManagedNewsPost — Noticia actualizada
   */
  return toManagedNewsPost(payload.post ?? {});
}

/**
 * Propósito: Borra una noticia propia.
 */
export async function deleteNewsPost(postId: number): Promise<void> {
  await requestAuthedBackend<null>({ path: `/news/${postId}`, method: "DELETE" });
  /**
   * Output:
   * Side effects — Noticia eliminada
   */
}
