import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoryApi, recipeApi } from '../api';
import type { components } from '../api/generated/openapi';
import { RecipeNotFound } from '../features/recipes/RecipeNotFound';
import { normalizeRecipeDraft, parseRecipeId, recipeSchema, type RecipeDraft as Draft } from '../features/recipes/validation';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

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
  if (loading) return <main className="mx-auto max-w-3xl px-5 py-10">Memuat resep…</main>;
  return <main className="mx-auto max-w-3xl px-5 py-10">
    <h1 className="text-3xl font-bold">{isEdit ? 'Ubah resep' : 'Tambah resep'}</h1>
    <form onSubmit={submit} noValidate className="mt-7 space-y-5">
      <label className="block">Judul<input className="mt-1 w-full rounded-lg border-stone-300" value={draft.title} onChange={(e) => set('title', e.target.value)} maxLength={150} />{errors.title && <span className="text-sm text-red-700">{errors.title}</span>}</label>
      <label className="block">Deskripsi<textarea className="mt-1 w-full rounded-lg border-stone-300" value={draft.description ?? ''} onChange={(e) => set('description', e.target.value || null)} maxLength={2000} />{errors.description && <span className="text-sm text-red-700">{errors.description}</span>}</label>
      <label className="block">URL gambar<input type="url" className="mt-1 w-full rounded-lg border-stone-300" value={draft.imageUrl ?? ''} onChange={(e) => set('imageUrl', e.target.value || null)} maxLength={2048} placeholder="https://…" />{errors.imageUrl && <span className="text-sm text-red-700">{errors.imageUrl}</span>}</label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">Waktu (menit)<input type="number" min={1} step={1} className="mt-1 w-full rounded-lg border-stone-300" value={draft.cookingTimeMinutes} onChange={(e) => set('cookingTimeMinutes', Number(e.target.value))} />{errors.cookingTimeMinutes && <span className="text-sm text-red-700">{errors.cookingTimeMinutes}</span>}</label>
        <label className="block">Porsi<input type="number" min={1} step={1} className="mt-1 w-full rounded-lg border-stone-300" value={draft.servings} onChange={(e) => set('servings', Number(e.target.value))} />{errors.servings && <span className="text-sm text-red-700">{errors.servings}</span>}</label>
        <label className="block">Kategori<select className="mt-1 w-full rounded-lg border-stone-300" value={draft.categoryId} onChange={(e) => set('categoryId', Number(e.target.value))}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{errors.categoryId && <span className="text-sm text-red-700">{errors.categoryId}</span>}</label>
      </div>
      <section><h2 className="font-semibold">Bahan (1–50)</h2>{draft.ingredients.map((item, index) => <div className="mt-2 grid gap-2 sm:grid-cols-3" key={index}>
        <label className="block"><input aria-label={`Nama bahan ${index + 1}`} className="w-full rounded-lg border-stone-300" placeholder="Nama bahan" maxLength={100} value={item.name} onChange={(e) => set('ingredients', draft.ingredients.map((entry, i) => i === index ? { ...entry, name: e.target.value } : entry))} />{rowError(errors, 'ingredients', index, 'name') && <span className="text-sm text-red-700">{rowError(errors, 'ingredients', index, 'name')}</span>}</label>
        <label className="block"><input aria-label={`Jumlah bahan ${index + 1}`} className="w-full rounded-lg border-stone-300" placeholder="Jumlah, mis. secukupnya" maxLength={50} value={item.quantity} onChange={(e) => set('ingredients', draft.ingredients.map((entry, i) => i === index ? { ...entry, quantity: e.target.value } : entry))} />{rowError(errors, 'ingredients', index, 'quantity') && <span className="text-sm text-red-700">{rowError(errors, 'ingredients', index, 'quantity')}</span>}</label>
        <div className="flex flex-wrap gap-2"><label className="block min-w-0 flex-1"><input aria-label={`Satuan bahan ${index + 1}`} className="w-full rounded-lg border-stone-300" placeholder="Satuan (opsional)" maxLength={30} value={item.unit ?? ''} onChange={(e) => set('ingredients', draft.ingredients.map((entry, i) => i === index ? { ...entry, unit: e.target.value || null } : entry))} />{rowError(errors, 'ingredients', index, 'unit') && <span className="text-sm text-red-700">{rowError(errors, 'ingredients', index, 'unit')}</span>}</label><button type="button" aria-label={`Pindahkan bahan ${index + 1} ke atas`} disabled={index === 0} onClick={() => set('ingredients', moveItem(draft.ingredients, index, -1))}>↑</button><button type="button" aria-label={`Pindahkan bahan ${index + 1} ke bawah`} disabled={index === draft.ingredients.length - 1} onClick={() => set('ingredients', moveItem(draft.ingredients, index, 1))}>↓</button><button type="button" onClick={() => set('ingredients', draft.ingredients.filter((_, i) => i !== index))}>Hapus</button></div>
      </div>)}{errors.ingredients && <p className="text-sm text-red-700">{errors.ingredients}</p>}<button type="button" className="mt-2 text-orange-800" disabled={draft.ingredients.length >= 50} onClick={() => set('ingredients', [...draft.ingredients, { name: '', quantity: '', unit: null }])}>+ Tambah bahan</button></section>
      <section><h2 className="font-semibold">Langkah (1–50)</h2>{draft.instructions.map((item, index) => <div className="mt-2 flex gap-2" key={index}><label className="block min-w-0 flex-1"><textarea aria-label={`Langkah ${index + 1}`} className="w-full rounded-lg border-stone-300" maxLength={2000} value={item.description} onChange={(e) => set('instructions', draft.instructions.map((entry, i) => i === index ? { description: e.target.value } : entry))} />{rowError(errors, 'instructions', index, 'description') && <span className="text-sm text-red-700">{rowError(errors, 'instructions', index, 'description')}</span>}</label><button type="button" aria-label={`Pindahkan langkah ${index + 1} ke atas`} disabled={index === 0} onClick={() => set('instructions', moveItem(draft.instructions, index, -1))}>↑</button><button type="button" aria-label={`Pindahkan langkah ${index + 1} ke bawah`} disabled={index === draft.instructions.length - 1} onClick={() => set('instructions', moveItem(draft.instructions, index, 1))}>↓</button><button type="button" onClick={() => set('instructions', draft.instructions.filter((_, i) => i !== index))}>Hapus</button></div>)}{errors.instructions && <p className="text-sm text-red-700">{errors.instructions}</p>}<button type="button" className="mt-2 text-orange-800" disabled={draft.instructions.length >= 50} onClick={() => set('instructions', [...draft.instructions, { description: '' }])}>+ Tambah langkah</button></section>
      {formError && <p role="alert" className="text-red-700">{formError}</p>}
      <button disabled={busy} className="rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Menyimpan…' : 'Simpan resep'}</button>
    </form>
  </main>;
}
