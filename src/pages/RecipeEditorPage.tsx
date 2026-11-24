import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoryApi, recipeApi } from '../api';
import type { components } from '../api/generated/openapi';
import { RecipeNotFound } from '../features/recipes/RecipeNotFound';
import { normalizeRecipeDraft, parseRecipeId, recipeSchema, type RecipeDraft as Draft } from '../features/recipes/validation';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageHeader } from '../components/Decor';
import { ImageField } from '../components/ImageField';

type Category = components['schemas']['Category'];

const CONNECTION_ERROR = 'Tidak dapat terhubung ke server. Coba lagi.';
const NOT_FOUND = 'Resep tidak ditemukan';

const emptyDraft: Draft = {
  title: '', description: null, imageUrl: null, cookingTimeMinutes: 1, servings: 1, categoryId: 1,
  ingredients: [{ name: '', quantity: '', unit: null }], instructions: [{ description: '' }],
};

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const reordered = [...items];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  return reordered;
}

function rowError(errors: Record<string, string>, collection: 'ingredients' | 'instructions', index: number, field: string) {
  // Bracket notation is a proposed v2.3 backend field format; dotted local paths remain supported.
  return errors[`${collection}[${index}].${field}`] ?? errors[`${collection}.${index}.${field}`];
}

export function RecipeEditorPage() {
  const { id } = useParams();
  // Rute tambah dan ubah memakai komponen yang sama; key mencegah isi form terbawa antar-rute.
  return <RecipeEditor key={id ?? 'new'} id={id} />;
}

function RecipeEditor({ id }: { id: string | undefined }) {
  const isEdit = id !== undefined;
  const recipeId = parseRecipeId(id);
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const notFound = isEdit && recipeId === null;
  useDocumentTitle(notFound || loadError === NOT_FOUND ? NOT_FOUND : isEdit ? 'Ubah resep' : 'Tambah resep');
  useEffect(() => { void categoryApi.list().then((r) => { if (r.data) setCategories(r.data); }); }, []);
  useEffect(() => {
    if (recipeId === null) return;
    let active = true;
    recipeApi.detail(recipeId).then((r) => {
      if (!active) return;
      if (!r.data) { setLoadError(r.response.status === 404 ? NOT_FOUND : r.error?.message ?? 'Resep gagal dimuat.'); return; }
      const recipe = r.data;
      setDraft({ title: recipe.title, description: recipe.description, imageUrl: recipe.imageUrl,
        cookingTimeMinutes: recipe.cookingTimeMinutes, servings: recipe.servings, categoryId: recipe.category.id,
        ingredients: recipe.ingredients.map(({ name, quantity, unit }) => ({ name, quantity, unit })),
        instructions: recipe.instructions.map(({ description }) => ({ description })) });
    }).catch(() => { if (active) setLoadError(CONNECTION_ERROR); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [recipeId]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setErrors({}); setFormError('');
    const parsed = recipeSchema.safeParse(normalizeRecipeDraft(draft));
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join('.')] ??= issue.message;
      setErrors(fieldErrors);
      return;
    }
    submitting.current = true; setBusy(true);
    try {
      const result = recipeId !== null ? await recipeApi.replace(recipeId, parsed.data) : await recipeApi.create(parsed.data);
      if (result.error) {
        const response = result.error as components['schemas']['ErrorResponse'];
        if (response.code === 'VALIDATION_ERROR') setErrors(Object.fromEntries((response.errors ?? []).map((item) => [item.field, item.message])));
        else setFormError(response.message);
      } else if (result.data) {
        navigate(`/recipes/${result.data.id}`);
        return;
      }
    } catch {
      setFormError(CONNECTION_ERROR);
    }
    submitting.current = false; setBusy(false);
  }
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  if (notFound) return <RecipeNotFound />;
  if (loadError) return <RecipeNotFound message={loadError} />;
  if (loading) return <main className="page py-24 text-center text-graphite">Memuat resep…</main>;
  const rowField = 'field mt-0';
  const iconButton = 'btn-outline btn-sm h-[2.875rem] w-11 px-0';
  return <main>
    <PageHeader eyebrow="Admin" title={isEdit ? 'Ubah resep' : 'Tambah resep'}>Isi data resep dengan lengkap agar mudah diikuti.</PageHeader>
    <div className="page py-12 sm:py-16">
      <form onSubmit={submit} noValidate className="mx-auto max-w-3xl space-y-12">
        <section className="space-y-5">
          <h2 className="dotted pb-3 text-3xl">Informasi</h2>
          <label className="field-label">Judul<input className="field" value={draft.title} onChange={(e) => set('title', e.target.value)} maxLength={150} />{errors.title && <span className="field-error">{errors.title}</span>}</label>
          <label className="field-label">Deskripsi<textarea rows={4} className="field" value={draft.description ?? ''} onChange={(e) => set('description', e.target.value || null)} maxLength={2000} />{errors.description && <span className="field-error">{errors.description}</span>}</label>
          <ImageField label="Foto resep" value={draft.imageUrl} onChange={(value) => set('imageUrl', value)} error={errors.imageUrl} />
          <div className="grid gap-5 sm:grid-cols-3">
            <label className="field-label">Waktu (menit)<input type="number" min={1} step={1} className="field" value={draft.cookingTimeMinutes} onChange={(e) => set('cookingTimeMinutes', Number(e.target.value))} />{errors.cookingTimeMinutes && <span className="field-error">{errors.cookingTimeMinutes}</span>}</label>
            <label className="field-label">Porsi<input type="number" min={1} step={1} className="field" value={draft.servings} onChange={(e) => set('servings', Number(e.target.value))} />{errors.servings && <span className="field-error">{errors.servings}</span>}</label>
            <label className="field-label">Kategori<select className="field" value={draft.categoryId} onChange={(e) => set('categoryId', Number(e.target.value))}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{errors.categoryId && <span className="field-error">{errors.categoryId}</span>}</label>
          </div>
        </section>
        <section>
          <h2 className="dotted pb-3 text-3xl">Bahan <span className="font-sans text-sm font-normal text-graphite">(1–50)</span></h2>
          {draft.ingredients.map((item, index) => <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]" key={index}>
            <label className="block"><input aria-label={`Nama bahan ${index + 1}`} className={rowField} placeholder="Nama bahan" maxLength={100} value={item.name} onChange={(e) => set('ingredients', draft.ingredients.map((entry, i) => i === index ? { ...entry, name: e.target.value } : entry))} />{rowError(errors, 'ingredients', index, 'name') && <span className="field-error">{rowError(errors, 'ingredients', index, 'name')}</span>}</label>
            <label className="block"><input aria-label={`Jumlah bahan ${index + 1}`} className={rowField} placeholder="Jumlah, mis. secukupnya" maxLength={50} value={item.quantity} onChange={(e) => set('ingredients', draft.ingredients.map((entry, i) => i === index ? { ...entry, quantity: e.target.value } : entry))} />{rowError(errors, 'ingredients', index, 'quantity') && <span className="field-error">{rowError(errors, 'ingredients', index, 'quantity')}</span>}</label>
            <label className="block"><input aria-label={`Satuan bahan ${index + 1}`} className={rowField} placeholder="Satuan (opsional)" maxLength={30} value={item.unit ?? ''} onChange={(e) => set('ingredients', draft.ingredients.map((entry, i) => i === index ? { ...entry, unit: e.target.value || null } : entry))} />{rowError(errors, 'ingredients', index, 'unit') && <span className="field-error">{rowError(errors, 'ingredients', index, 'unit')}</span>}</label>
            <div className="flex gap-2"><button type="button" className={iconButton} aria-label={`Pindahkan bahan ${index + 1} ke atas`} disabled={index === 0} onClick={() => set('ingredients', moveItem(draft.ingredients, index, -1))}>↑</button><button type="button" className={iconButton} aria-label={`Pindahkan bahan ${index + 1} ke bawah`} disabled={index === draft.ingredients.length - 1} onClick={() => set('ingredients', moveItem(draft.ingredients, index, 1))}>↓</button><button type="button" className="btn-danger btn-sm h-[2.875rem]" onClick={() => set('ingredients', draft.ingredients.filter((_, i) => i !== index))}>Hapus</button></div>
          </div>)}
          {errors.ingredients && <p className="field-error">{errors.ingredients}</p>}
          <button type="button" className="btn-outline btn-sm mt-5" disabled={draft.ingredients.length >= 50} onClick={() => set('ingredients', [...draft.ingredients, { name: '', quantity: '', unit: null }])}>+ Tambah bahan</button>
        </section>
        <section>
          <h2 className="dotted pb-3 text-3xl">Langkah <span className="font-sans text-sm font-normal text-graphite">(1–50)</span></h2>
          {draft.instructions.map((item, index) => <div className="mt-4 flex gap-3" key={index}>
            <span className="w-8 shrink-0 pt-3 text-xl font-bold leading-none text-olive" aria-hidden="true">{index + 1}</span>
            <label className="block min-w-0 flex-1"><textarea rows={3} aria-label={`Langkah ${index + 1}`} className={rowField} maxLength={2000} value={item.description} onChange={(e) => set('instructions', draft.instructions.map((entry, i) => i === index ? { description: e.target.value } : entry))} />{rowError(errors, 'instructions', index, 'description') && <span className="field-error">{rowError(errors, 'instructions', index, 'description')}</span>}</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start"><button type="button" className={iconButton} aria-label={`Pindahkan langkah ${index + 1} ke atas`} disabled={index === 0} onClick={() => set('instructions', moveItem(draft.instructions, index, -1))}>↑</button><button type="button" className={iconButton} aria-label={`Pindahkan langkah ${index + 1} ke bawah`} disabled={index === draft.instructions.length - 1} onClick={() => set('instructions', moveItem(draft.instructions, index, 1))}>↓</button><button type="button" className="btn-danger btn-sm h-[2.875rem]" onClick={() => set('instructions', draft.instructions.filter((_, i) => i !== index))}>Hapus</button></div>
          </div>)}
          {errors.instructions && <p className="field-error">{errors.instructions}</p>}
          <button type="button" className="btn-outline btn-sm mt-5" disabled={draft.instructions.length >= 50} onClick={() => set('instructions', [...draft.instructions, { description: '' }])}>+ Tambah langkah</button>
        </section>
        <div className="border-t border-dotted border-black/40 pt-8">
          {formError && <p role="alert" className="mb-4 text-sm text-red-700">{formError}</p>}
          <button disabled={busy} className="btn-primary w-full sm:w-auto">{busy ? 'Menyimpan…' : 'Simpan resep'}</button>
        </div>
      </form>
    </div>
  </main>;
}
