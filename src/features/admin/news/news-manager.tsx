"use client";

import type { OwnedTenant } from "@/application/admin-access";
import { useI18n } from "@/core/i18n/provider";
import {
  MAX_NEWS_BODY_LENGTH,
  MAX_NEWS_TITLE_LENGTH,
  isScheduledNewsPost,
  toDateTimeLocalValue,
  type ManagedNewsPost,
} from "@/domain/news";
import { PanelSection } from "@/features/admin/platform/platform-ui";
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";
import { formatDateTime } from "@/shared/lib/datetime";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { TextAreaField, TextField } from "@/shared/ui/input";
import { useMemo, useState } from "react";

export interface NewsEventOption {
  eventId: number;
  organizationId: number;
  name: string;
}

interface NewsFormState {
  organizationId: number;
  title: string;
  body: string;
  imageUrl: string;
  eventId: string;
  publishAt: string;
}

const SELECT_CLASS =
  "w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone outline-none focus:border-lime/70 disabled:opacity-60";

/**
 * Propósito: Formulario vacío para una noticia nueva en el primer tenant.
 */
function emptyForm(organizationId: number): NewsFormState {
  /**
   * Output:
   * @returns NewsFormState — Campos vacíos
   */
  return { organizationId, title: "", body: "", imageUrl: "", eventId: "", publishAt: "" };
}

/**
 * Propósito: Noticias de sede: publicar (o programar), editar y borrar. El backend vuelve a
 * validar dueño, módulo, evento del mismo tenant y fecha.
 */
export function NewsManager({
  tenants,
  posts,
  events,
  isReadOnly,
}: {
  tenants: OwnedTenant[];
  posts: ManagedNewsPost[];
  events: NewsEventOption[];
  isReadOnly: boolean;
}) {
  const { t, intlLocale } = useI18n();
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const defaultOrganizationId = tenants[0]?.organizationId ?? 0;
  const [form, setForm] = useState<NewsFormState>(() => emptyForm(defaultOrganizationId));
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [isEditingScheduled, setIsEditingScheduled] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const tenantEvents = useMemo(
    () => events.filter((event) => event.organizationId === form.organizationId),
    [events, form.organizationId],
  );
  const canWrite = !isReadOnly && tenants.length > 0;

  /**
   * Propósito: Actualiza un campo del formulario.
   */
  function updateField<K extends keyof NewsFormState>(key: K, value: NewsFormState[K]) {
    setSavedNotice(false);
    setForm((current) => ({
      ...current,
      [key]: value,
      // Cambiar de tenant invalida el evento elegido (es de otra sede).
      ...(key === "organizationId" ? { eventId: "" } : {}),
    }));
  }

  /**
   * Propósito: Carga una noticia en el formulario para editarla.
   */
  function startEditing(post: ManagedNewsPost) {
    setSavedNotice(false);
    setEditingPostId(post.postId);
    setIsEditingScheduled(isScheduledNewsPost(post));
    setForm({
      organizationId: post.organizationId,
      title: post.title,
      body: post.body,
      imageUrl: post.imageUrl ?? "",
      eventId: post.eventId ? String(post.eventId) : "",
      publishAt: isScheduledNewsPost(post) ? toDateTimeLocalValue(post.publishedAt) : "",
    });
    /**
     * Output:
     * Side effects — Formulario en modo edición
     */
  }

  /**
   * Propósito: Sale del modo edición sin guardar.
   */
  function cancelEditing() {
    setEditingPostId(null);
    setForm(emptyForm(defaultOrganizationId));
  }

  /**
   * Propósito: Publica o guarda la noticia y limpia el formulario si salió bien.
   */
  async function handleSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setSavedNotice(false);
    const publishedAt = form.publishAt ? new Date(form.publishAt).toISOString() : undefined;
    const fields = {
      title: form.title,
      body: form.body,
      image_url: form.imageUrl.trim() || null,
      event_id: form.eventId ? Number(form.eventId) : null,
    };
    const response =
      editingPostId === null
        ? await runMutation("save", "/api/news", "POST", {
            ...fields,
            organization_id: form.organizationId,
            ...(publishedAt ? { published_at: publishedAt } : {}),
          })
        : await runMutation("save", `/api/news/${editingPostId}`, "PUT", {
            ...fields,
            // Sin fecha: una programada se publica ahora; una ya publicada conserva su fecha.
            ...(publishedAt
              ? { published_at: publishedAt }
              : isEditingScheduled
                ? { published_at: new Date().toISOString() }
                : {}),
          });
    if (response !== null) {
      setEditingPostId(null);
      setForm(emptyForm(defaultOrganizationId));
      setSavedNotice(true);
    }
    /**
     * Output:
     * Side effects — Noticia guardada o error visible
     */
  }

  /**
   * Propósito: Pide confirmación antes de borrar una noticia.
   */
  function requestDelete(post: ManagedNewsPost) {
    askConfirmation({
      title: t("admin.newsDeleteTitle", { title: post.title }),
      description: t("admin.newsDeleteDescription"),
      confirmLabel: t("admin.newsDeleteConfirm"),
      tone: "danger",
      run: async () => {
        const response = await runMutation(`delete-${post.postId}`, `/api/news/${post.postId}`, "DELETE");
        if (response !== null && editingPostId === post.postId) {
          cancelEditing();
        }
      },
    });
    /**
     * Output:
     * Side effects — Abre el modal; la noticia sigue hasta aceptar
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Formulario y listado
   */
  return (
    <div className="space-y-6">
      {confirmationDialog}
      {canWrite ? (
        <PanelSection title={editingPostId === null ? t("admin.newsFormTitle") : t("admin.newsEditTitle")}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage ? <Alert>{errorMessage}</Alert> : null}
            {tenants.length > 1 ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-mist">{t("admin.newsTenantLabel")}</span>
                <select
                  value={form.organizationId}
                  disabled={editingPostId !== null}
                  onChange={(changeEvent) => updateField("organizationId", Number(changeEvent.target.value))}
                  className={SELECT_CLASS}
                >
                  {tenants.map((tenant) => (
                    <option key={tenant.organizationId} value={tenant.organizationId}>
                      {tenant.organizationName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <TextField
              label={t("admin.newsTitleLabel")}
              name="title"
              required
              minLength={3}
              maxLength={MAX_NEWS_TITLE_LENGTH}
              value={form.title}
              onChange={(changeEvent) => updateField("title", changeEvent.target.value)}
            />
            <TextAreaField
              label={t("admin.newsBodyLabel")}
              name="body"
              required
              rows={5}
              maxLength={MAX_NEWS_BODY_LENGTH}
              value={form.body}
              onChange={(changeEvent) => updateField("body", changeEvent.target.value)}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label={t("admin.newsImageLabel")}
                name="image_url"
                type="url"
                maxLength={500}
                placeholder="https://"
                hint={t("admin.newsImageHint")}
                value={form.imageUrl}
                onChange={(changeEvent) => updateField("imageUrl", changeEvent.target.value)}
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-mist">{t("admin.newsEventLabel")}</span>
                <select
                  name="event_id"
                  value={form.eventId}
                  onChange={(changeEvent) => updateField("eventId", changeEvent.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">{t("admin.newsEventNone")}</option>
                  {tenantEvents.map((event) => (
                    <option key={event.eventId} value={event.eventId}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <TextField
              label={t("admin.newsPublishAtLabel")}
              name="published_at"
              type="datetime-local"
              hint={t("admin.newsPublishAtHint")}
              value={form.publishAt}
              onChange={(changeEvent) => updateField("publishAt", changeEvent.target.value)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" isLoading={pendingActionKey === "save"}>
                {editingPostId === null ? t("admin.newsPublish") : t("admin.newsSave")}
              </Button>
              {editingPostId !== null ? (
                <Button variant="secondary" onClick={cancelEditing}>
                  {t("admin.newsCancelEdit")}
                </Button>
              ) : null}
              {savedNotice ? <p className="text-xs font-semibold text-lime">{t("admin.newsSaved")}</p> : null}
            </div>
          </form>
        </PanelSection>
      ) : null}

      <PanelSection title={t("admin.newsListTitle")}>
        {!canWrite && errorMessage ? <Alert>{errorMessage}</Alert> : null}
        {posts.length === 0 ? (
          <p className="text-sm text-mist">{t("admin.newsEmpty")}</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {posts.map((post) => (
              <li key={post.postId} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-semibold text-bone">{post.title}</p>
                  <p className="text-xs text-mist">
                    {t(isScheduledNewsPost(post) ? "admin.newsScheduled" : "admin.newsPublishedAt", {
                      date: formatDateTime(post.publishedAt, intlLocale),
                    })}
                    {tenants.length > 1 ? ` · ${post.organizationName}` : ""}
                    {post.eventName ? ` · ${post.eventName}` : ""}
                    {post.authorName ? ` · ${t("admin.newsBy", { name: post.authorName })}` : ""}
                  </p>
                  <p className="line-clamp-2 whitespace-pre-line text-sm text-mist/90">{post.body}</p>
                </div>
                {canWrite ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => startEditing(post)}>
                      {t("admin.newsEdit")}
                    </Button>
                    <Button
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      isLoading={pendingActionKey === `delete-${post.postId}`}
                      onClick={() => requestDelete(post)}
                    >
                      {t("admin.newsDelete")}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PanelSection>
    </div>
  );
}
