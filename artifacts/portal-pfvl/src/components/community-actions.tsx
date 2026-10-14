import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDashboardQueryKey,
  getGetPostQueryKey,
  getListAdminPostsQueryKey,
  getListPostsQueryKey,
  getListCommentsQueryKey,
  useCreateComment,
  useCreateImageUpload,
  useCreatePost,
  type PostKind,
  type PostStatus,
} from "@workspace/api-client-react";
import { AuthActionGate } from "@/components/auth-ui";

const fieldClass = "mt-1.5 w-full rounded-xl border border-[#233a59]/15 bg-white px-3.5 py-3 text-sm text-[#1d1d1b] outline-none focus:border-[#233a59] focus:ring-2 focus:ring-[#233a59]/10";
const errorText = (error: unknown) => error instanceof Error ? error.message : "Não foi possível concluir a solicitação.";

export function ImageUploadField({ imageUrl, onImageUrlChange, required = false }: { imageUrl: string; onImageUrlChange: (url: string) => void; required?: boolean }) {
  const upload = useCreateImageUpload();
  const [message, setMessage] = useState("");
  async function uploadImage(file: File) {
    setMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage("Escolha JPG, PNG ou WebP de até 5 MB.");
      return;
    }
    try {
      const signed = await upload.mutateAsync({ data: { fileName: file.name, contentType: file.type as "image/jpeg" | "image/png" | "image/webp", sizeBytes: file.size } });
      const result = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!result.ok) throw new Error("O R2 recusou o envio.");
      onImageUrlChange(signed.publicUrl);
      setMessage("Imagem enviada ao R2.");
    } catch (error) {
      setMessage(errorText(error));
    }
  }
  return (
    <div>
      <label className="block text-sm font-semibold text-[#012140]">Imagem de capa{required ? " *" : ""}
        <input accept="image/jpeg,image/png,image/webp" className={fieldClass} disabled={upload.isPending} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void uploadImage(file); event.currentTarget.value = ""; }} type="file" />
      </label>
      <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WebP até 5 MB. Também é possível informar um endereço HTTPS.</p>
      <input aria-label="Endereço HTTPS da imagem" className={fieldClass} onChange={(event) => onImageUrlChange(event.target.value)} placeholder="https://..." type="url" value={imageUrl} />
      {upload.isPending && <p className="mt-2 text-xs text-muted-foreground">Enviando imagem…</p>}
      {message && <p className="mt-2 text-xs text-[#233a59]" role="status">{message}</p>}
      {imageUrl && <img alt="Prévia da imagem de capa" className="mt-3 max-h-52 w-full rounded-xl object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} onLoad={(event) => { event.currentTarget.style.display = "block"; }} src={imageUrl} />}
    </div>
  );
}

export function CreatePostForm({ mode, onCreated }: { mode: "community" | "admin"; onCreated?: () => void }) {
  const client = useQueryClient();
  const mutation = useCreatePost();
  const [kind, setKind] = useState<PostKind>(mode === "community" ? "forum" : "blog");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(mode === "community" ? "Planejamento financeiro" : "");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<PostStatus>("published");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if ((kind === "blog" || kind === "forum") && !image.trim()) return setMessage("Adicione uma imagem de capa.");
    try {
      await mutation.mutateAsync({ data: {
        title: title.trim(), excerpt: body.trim().replace(/\s+/g, " ").slice(0, 220), body: body.trim(),
        kind, category: category.trim(), tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
        coverImageUrl: image.trim() || null, videoUrl: null, status: mode === "admin" ? status : "published",
      } });
      setTitle(""); setBody(""); setTags(""); setImage("");
      setMessage(status === "draft" ? "Rascunho salvo." : "Publicação criada.");
      await Promise.all([
        client.invalidateQueries({ queryKey: getListPostsQueryKey() }),
        client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
        client.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
      ]);
      onCreated?.();
    } catch (error) { setMessage(errorText(error)); }
  }
  return (
    <AuthActionGate>
      <form className="space-y-4 rounded-2xl border border-[#233a59]/15 bg-white p-5 sm:p-6" onSubmit={submit}>
        <div><p className="eyebrow-pill">{mode === "community" ? "Nova conversa" : "Publicação do portal"}</p><h2 className="mt-2 font-display text-xl font-semibold text-[#012140]">{mode === "community" ? "Compartilhe com a comunidade." : "Criar conteúdo"}</h2></div>
        {mode === "admin" && <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-[#012140]">Área<select className={fieldClass} onChange={(event) => setKind(event.target.value as PostKind)} value={kind}><option value="blog">Blog</option><option value="forum">Comunidade</option><option value="news">Novidades</option><option value="help">Central de ajuda</option></select></label>
          <label className="block text-sm font-semibold text-[#012140]">Situação<select className={fieldClass} onChange={(event) => setStatus(event.target.value as PostStatus)} value={status}><option value="published">Publicado</option><option value="draft">Rascunho</option><option value="hidden">Oculto</option></select></label>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-[#012140]">Título<input className={fieldClass} maxLength={220} minLength={4} onChange={(event) => setTitle(event.target.value)} required value={title} /></label>
          <label className="block text-sm font-semibold text-[#012140]">Categoria<input className={fieldClass} maxLength={100} minLength={2} onChange={(event) => setCategory(event.target.value)} required value={category} /></label>
        </div>
        <label className="block text-sm font-semibold text-[#012140]">Conteúdo<textarea className={`${fieldClass} min-h-40 resize-y`} maxLength={20000} minLength={10} onChange={(event) => setBody(event.target.value)} required value={body} /></label>
        <ImageUploadField imageUrl={image} onImageUrlChange={setImage} required={kind === "blog" || kind === "forum"} />
        <label className="block text-sm font-semibold text-[#012140]">Marcadores<input className={fieldClass} onChange={(event) => setTags(event.target.value)} placeholder="orçamento, planejamento" value={tags} /></label>
        {message && <p className="text-sm text-[#233a59]" role="status">{message}</p>}
        <button className="auth-header-primary" disabled={mutation.isPending || ((kind === "blog" || kind === "forum") && !image.trim())} type="submit">{mutation.isPending ? "Salvando…" : status === "draft" ? "Salvar rascunho" : "Publicar"}</button>
      </form>
    </AuthActionGate>
  );
}

export function CommunityCreatePanel() {
  const [open, setOpen] = useState(false);
  return open ? <div className="community-create-panel space-y-3"><button className="text-sm font-semibold text-[#233a59]" onClick={() => setOpen(false)} type="button">← Fechar formulário</button><CreatePostForm mode="community" onCreated={() => setOpen(false)} /></div> : <section className="community-create-panel"><AuthActionGate><button className="auth-header-primary" onClick={() => setOpen(true)} type="button">Criar tópico</button></AuthActionGate></section>;
}

export function CommentComposer({ postId, parentCommentId = null, onCancel }: { postId: number; parentCommentId?: number | null; onCancel?: () => void }) {
  return <AuthActionGate><SignedInCommentComposer postId={postId} parentCommentId={parentCommentId} onCancel={onCancel} /></AuthActionGate>;
}

function SignedInCommentComposer({ postId, parentCommentId, onCancel }: { postId: number; parentCommentId: number | null; onCancel?: () => void }) {
  const client = useQueryClient();
  const mutation = useCreateComment();
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await mutation.mutateAsync({ postId, data: { body: body.trim(), parentCommentId } });
      setBody(""); setMessage("Sua resposta foi publicada.");
      await Promise.all([client.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) }), client.invalidateQueries({ queryKey: getGetPostQueryKey(postId) })]);
    } catch (error) { setMessage(errorText(error)); }
  }
  return <form className="space-y-3 rounded-2xl border border-[#233a59]/15 bg-white p-4" onSubmit={submit}>
    <label className="block text-sm font-semibold text-[#012140]">{parentCommentId ? "Sua resposta" : "Escreva um comentário"}<textarea className={`${fieldClass} min-h-24 resize-y`} maxLength={5000} minLength={2} onChange={(event) => setBody(event.target.value)} required value={body} /></label>
    {message && <p className="text-xs text-[#233a59]" role="status">{message}</p>}
    <div className="flex gap-2"><button className="auth-header-primary" disabled={mutation.isPending} type="submit">{mutation.isPending ? "Enviando…" : "Enviar"}</button>{onCancel && <button className="auth-header-link !border-[#233a59]/20 !text-[#233a59]" onClick={onCancel} type="button">Cancelar</button>}</div>
  </form>;
}

export function ReplyControl({ postId, commentId }: { postId: number; commentId: number }) {
  const [open, setOpen] = useState(false);
  return <div className="mt-3">{open ? <CommentComposer postId={postId} parentCommentId={commentId} onCancel={() => setOpen(false)} /> : <button className="text-xs font-semibold text-[#233a59] hover:underline" onClick={() => setOpen(true)} type="button">Responder</button>}</div>;
}
