import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { articleApi } from '../api';
import type { components } from '../api/generated/openapi';
import { ARTICLE_CATEGORIES, articleSchema, normalizeArticleDraft, type ArticleDraft } from '../features/articles/validation';
import { parseRecipeId as parseId } from '../features/recipes/validation';
import { RecipeNotFound } from '../features/recipes/RecipeNotFound';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageHeader } from '../components/Decor';
import { ImageField } from '../components/ImageField';

const emptyDraft: ArticleDraft = { title: '', excerpt: null, content: '', coverImageUrl: null, category: 'TIPS', tags: [] };

export function ArticleEditorPage() {
  const { id } = useParams();
  return <ArticleEditor key={id ?? 'baru'} id={id} />;
}

function ArticleEditor({ id }: { id: string | undefined }) {
  const isEdit = id !== undefined;
  const articleId = parseId(id);
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ArticleDraft>(emptyDraft);
  const [tagText, setTagText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  useDocumentTitle(isEdit ? 'Ubah artikel' : 'Tulis artikel');
  useEffect(() => {
    if (articleId === null) return;
    let active = true;
    articleApi.detail(articleId).then((result) => {
      if (!active) return;
      if (!result.data) { setLoadError(result.response.status === 404 ? 'Artikel tidak ditemukan' : result.error?.message ?? 'Artikel gagal dimuat.'); return; }
      const article = result.data;
      setDraft({ title: article.title, excerpt: article.excerpt, content: article.content, coverImageUrl: article.coverImageUrl, category: article.category, tags: article.tags });
      setTagText(article.tags.join(', '));
    }).catch(() => { if (active) setLoadError('Tidak dapat terhubung ke server. Coba lagi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [articleId]);
  const set = <K extends keyof ArticleDraft>(key: K, value: ArticleDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setErrors({}); setFormError('');
    const candidate = normalizeArticleDraft({ ...draft, tags: tagText.split(',') });
    const parsed = articleSchema.safeParse(candidate);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
      setErrors(fieldErrors);
      return;
    }
    submitting.current = true; setBusy(true);
    try {
      const result = articleId !== null ? await articleApi.replace(articleId, parsed.data) : await articleApi.create(parsed.data);
      if (result.data) { navigate(`/artikel/${result.data.id}`); return; }
      const response = result.error as components['schemas']['ErrorResponse'];
      if (response.code === 'VALIDATION_ERROR') setErrors(Object.fromEntries((response.errors ?? []).map((item) => [item.field.replace(/\[\d+\]$/, ''), item.message])));
      else setFormError(response.message);
    } catch {
      setFormError('Tidak dapat terhubung ke server. Coba lagi.');
    }
    submitting.current = false; setBusy(false);
  }
  if (isEdit && articleId === null) return <RecipeNotFound message="Artikel tidak ditemukan" />;
  if (loadError) return <RecipeNotFound message={loadError} />;
  if (loading) return <main className="page py-24 text-center text-graphite">Memuat artikel…</main>;
  return <main>
    <PageHeader eyebrow="Admin" title={isEdit ? 'Ubah artikel' : 'Tulis artikel'}>Paragraf dipisahkan dengan satu baris kosong.</PageHeader>
    <div className="page py-12 sm:py-16">
      <form onSubmit={submit} noValidate className="mx-auto max-w-3xl space-y-6">
        <label className="field-label">Judul<input className="field" maxLength={150} value={draft.title} onChange={(e) => set('title', e.target.value)} />{errors.title && <span className="field-error">{errors.title}</span>}</label>
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="field-label">Kategori<select className="field" value={draft.category} onChange={(e) => set('category', e.target.value as ArticleDraft['category'])}>{ARTICLE_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>{errors.category && <span className="field-error">{errors.category}</span>}</label>
          <label className="field-label">Tag (pisahkan dengan koma, maks. 8)<input className="field" placeholder="santan, rendang" value={tagText} onChange={(e) => setTagText(e.target.value)} />{errors.tags && <span className="field-error">{errors.tags}</span>}</label>
        </div>
        <label className="field-label">Ringkasan (opsional, tampil sebagai kutipan)<textarea rows={2} maxLength={300} className="field" value={draft.excerpt ?? ''} onChange={(e) => set('excerpt', e.target.value || null)} />{errors.excerpt && <span className="field-error">{errors.excerpt}</span>}</label>
        <ImageField label="Foto sampul" value={draft.coverImageUrl} onChange={(value) => set('coverImageUrl', value)} error={errors.coverImageUrl} />
        <label className="field-label">Isi artikel<textarea rows={16} maxLength={20000} className="field leading-relaxed" value={draft.content} onChange={(e) => set('content', e.target.value)} />{errors.content && <span className="field-error">{errors.content}</span>}</label>
        <div className="border-t border-dotted border-black/40 pt-8">
          {formError && <p role="alert" className="mb-4 text-sm text-red-700">{formError}</p>}
          <button disabled={busy} className="btn-primary w-full sm:w-auto">{busy ? 'Menyimpan…' : isEdit ? 'Simpan perubahan' : 'Terbitkan artikel'}</button>
        </div>
      </form>
    </div>
  </main>;
}
