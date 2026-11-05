import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { categoryApi, recipeApi, userApi } from '../api';
import { useAuth } from '../features/auth/AuthProvider';
import type { components } from '../api/generated/openapi';
import { RecipeNotFound } from '../features/recipes/RecipeNotFound';
import { parseRecipeId } from '../features/recipes/validation';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

type RecipeSummary = components['schemas']['RecipeSummary'];
type RecipeDetail = components['schemas']['RecipeDetail'];
type Page = components['schemas']['RecipePage'];
type Category = components['schemas']['Category'];

function Pagination({ page, onPage }: { page: Page; onPage: (page: number) => void }) {
  if (page.totalPages <= 1) return null;
  return <nav aria-label="Navigasi halaman resep" className="mt-8 flex flex-wrap items-center justify-center gap-4">
    <button type="button" disabled={page.page <= 1} onClick={() => onPage(page.page - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Sebelumnya</button>
    <span>Halaman {page.page} dari {page.totalPages}</span>
    <button type="button" disabled={!page.hasNext} onClick={() => onPage(page.page + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Berikutnya</button>
  </nav>;
}

function useLoginState() {
  const location = useLocation();
  return { from: `${location.pathname}${location.search}${location.hash}` };
}

export function RecipeCard({ recipe, signedIn, isAdmin, onFavorite, onDelete }: {
  recipe: RecipeSummary; signedIn: boolean; isAdmin: boolean;
  onFavorite: (recipe: RecipeSummary) => void; onDelete?: (recipe: RecipeSummary) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const loginState = useLoginState();
  return <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
    {recipe.imageUrl && !imageFailed ? <img src={recipe.imageUrl} alt="" className="h-48 w-full object-cover" onError={() => setImageFailed(true)} /> : <div className="flex h-48 items-center justify-center bg-orange-100 text-5xl" aria-hidden="true">🍲</div>}
    <div className="p-4"><p className="text-sm text-orange-800">{recipe.category.name}</p><div className="flex items-start justify-between gap-3"><Link to={`/recipes/${recipe.id}`} className="text-xl font-semibold hover:text-orange-800">{recipe.title}</Link>
      {signedIn
        ? <button type="button" aria-pressed={recipe.isFavorited} aria-label={recipe.isFavorited ? 'Hapus dari favorit' : 'Simpan ke favorit'} onClick={() => onFavorite(recipe)} className="text-2xl text-orange-800">{recipe.isFavorited ? '♥' : '♡'}</button>
        : <Link to="/login" state={loginState} aria-label="Masuk untuk menyimpan ke favorit" className="text-2xl text-orange-800">♡</Link>}
    </div><p className="mt-2 line-clamp-2 text-sm text-stone-600">{recipe.description}</p><p className="mt-3 text-sm text-stone-500">{recipe.cookingTimeMinutes} menit · {recipe.servings} porsi</p>
      {isAdmin && <div className="mt-4 flex gap-3 border-t pt-3"><Link className="text-sm font-semibold text-orange-800" to={`/admin/recipes/${recipe.id}/edit`}>Ubah</Link><button type="button" className="text-sm text-red-700" onClick={() => onDelete?.(recipe)}>Hapus</button></div>}
    </div>
  </article>;
}

export function RecipeListPage() {
  useDocumentTitle('Jelajahi resep');
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [resultPage, setResultPage] = useState<Page | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [ingredientDraft, setIngredientDraft] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [favoriteError, setFavoriteError] = useState('');
  const query = searchParams.get('q') ?? '';
  const categoryId = searchParams.get('categoryId') ?? '';
  const ingredients = useMemo(() => searchParams.getAll('ingredient').map((ingredient) => ingredient.trim()).filter(Boolean), [searchParams]);
  const pageParam = Number(searchParams.get('page'));
  const pageNumber = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  function updateFilters(next: { query?: string; categoryId?: string; ingredients?: string[]; page?: number }) {
    const params = new URLSearchParams();
    const nextQuery = next.query ?? query;
    const nextCategoryId = next.categoryId ?? categoryId;
    const nextIngredients = next.ingredients ?? ingredients;
    const nextPage = next.page ?? 1;
    if (nextQuery) params.set('q', nextQuery);
    if (nextCategoryId) params.set('categoryId', nextCategoryId);
    nextIngredients.forEach((ingredient) => params.append('ingredient', ingredient));
    if (nextPage > 1) params.set('page', String(nextPage));
    setSearchParams(params, { replace: true });
  }

  useEffect(() => { void categoryApi.list().then((result) => { if (result.data) setCategories(result.data); }); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setError('');
      void recipeApi.list({ page: pageNumber, size: 12, q: query.trim().length >= 2 ? query.trim() : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined, ingredient: ingredients.length ? ingredients : undefined, sort: 'newest' }).then((result) => {
        if (result.data) setResultPage(result.data);
        else setError(result.error?.message ?? 'Resep gagal dimuat.');
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [query, categoryId, ingredients, pageNumber, user?.id, reloadKey]);
  async function toggleFavorite(recipe: RecipeSummary) {
    if (!resultPage) return;
    setFavoriteError('');
    setResultPage({ ...resultPage, content: resultPage.content.map((item) => item.id === recipe.id ? { ...item, isFavorited: !item.isFavorited } : item) });
    const result = recipe.isFavorited ? await recipeApi.unfavorite(recipe.id) : await recipeApi.favorite(recipe.id);
    if (result.error) {
      setResultPage((current) => current && ({ ...current, content: current.content.map((item) => item.id === recipe.id ? { ...item, isFavorited: recipe.isFavorited } : item) }));
      setFavoriteError(result.error.message);
    }
  }
  async function deleteRecipe(recipe: RecipeSummary) {
    if (!window.confirm(`Hapus resep “${recipe.title}”?`)) return;
    const result = await recipeApi.remove(recipe.id);
    if (result.error) { setError(result.error.message); return; }
    if (resultPage?.content.length === 1 && resultPage.page > 1) updateFilters({ page: resultPage.page - 1 });
    else setReloadKey((key) => key + 1);
  }
  function addIngredient() {
    const ingredient = ingredientDraft.trim();
    if (!ingredient) return;
    updateFilters({ ingredients: [...ingredients, ingredient] });
    setIngredientDraft('');
  }
  return <main className="mx-auto max-w-6xl px-5 py-10">
    <h1 className="text-3xl font-bold">Jelajahi resep</h1>
    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
      <input aria-label="Cari resep" className="w-full max-w-xl rounded-xl border-stone-300" placeholder="Cari nama masakan…" value={query} onChange={(e) => updateFilters({ query: e.target.value })} />
      <select aria-label="Filter kategori" className="rounded-xl border-stone-300" value={categoryId} onChange={(e) => updateFilters({ categoryId: e.target.value })}>
        <option value="">Semua kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
    </div>
    <form className="mt-4 flex max-w-xl gap-2" onSubmit={(event) => { event.preventDefault(); addIngredient(); }}>
      <input aria-label="Tambah bahan pencarian" className="min-w-0 flex-1 rounded-xl border-stone-300" placeholder="Cari bahan, mis. ayam" value={ingredientDraft} onChange={(event) => setIngredientDraft(event.target.value)} />
      <button type="submit" className="rounded-xl border px-4 py-2 text-orange-800">Tambah bahan</button>
    </form>
    {ingredients.length > 0 && <ul aria-label="Bahan pencarian terpilih" className="mt-3 flex flex-wrap gap-2">
      {ingredients.map((ingredient, index) => <li key={`${ingredient}-${index}`} className="flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-950">
        <span>{ingredient}</span><button type="button" aria-label={`Hapus filter bahan ${ingredient}`} onClick={() => updateFilters({ ingredients: ingredients.filter((_, itemIndex) => itemIndex !== index) })} className="font-bold">×</button>
      </li>)}
    </ul>}
    {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    {favoriteError && <p role="alert" className="mt-4 text-red-700">{favoriteError}</p>}
    {!resultPage && !error && <p className="mt-8">Memuat resep…</p>}
    {resultPage?.content.length === 0 && <p className="mt-8">Belum ada resep yang cocok.</p>}
    <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{resultPage?.content.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} signedIn={Boolean(user)} isAdmin={user?.role === 'ADMIN'} onFavorite={(item) => void toggleFavorite(item)} onDelete={(item) => void deleteRecipe(item)} />)}</div>
    {resultPage && <Pagination page={resultPage} onPage={(page) => updateFilters({ page })} />}
  </main>;
}

export function RecipeDetailPage() {
  const { id } = useParams();
  const recipeId = parseRecipeId(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const loginState = useLoginState();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [favoriteError, setFavoriteError] = useState('');
  useDocumentTitle(recipeId === null || notFound ? 'Resep tidak ditemukan' : recipe?.title ?? 'Memuat resep');
  useEffect(() => {
    if (recipeId === null) return;
    let active = true;
    setNotFound(false); setError('');
    recipeApi.detail(recipeId).then((result) => {
      if (!active) return;
      if (result.data) setRecipe(result.data);
      else if (result.response.status === 404) setNotFound(true);
      else setError(result.error?.message ?? 'Resep gagal dimuat.');
    }).catch(() => { if (active) setError('Tidak dapat terhubung ke server. Coba lagi.'); });
    return () => { active = false; };
  }, [recipeId, user?.id]);
  async function toggleFavorite() {
    if (!recipe) return;
    setFavoriteError('');
    const wasFavorited = recipe.isFavorited;
    setRecipe({ ...recipe, isFavorited: !wasFavorited });
    const result = wasFavorited ? await recipeApi.unfavorite(recipe.id) : await recipeApi.favorite(recipe.id);
    if (result.error) { setRecipe((current) => current && ({ ...current, isFavorited: wasFavorited })); setFavoriteError(result.error.message); }
  }
  async function deleteRecipe() {
    if (!recipe || !window.confirm(`Hapus resep “${recipe.title}”?`)) return;
    const result = await recipeApi.remove(recipe.id);
    if (result.error) { setError(result.error.message); return; }
    navigate('/recipes', { replace: true });
  }
  if (recipeId === null || notFound) return <RecipeNotFound />;
  if (error) return <RecipeNotFound message={error} />;
  if (!recipe || recipe.id !== recipeId) return <main className="mx-auto max-w-4xl px-5 py-12">Memuat resep…</main>;
  return <main className="mx-auto max-w-4xl px-5 py-10">
    {recipe.imageUrl && !imageFailed ? <img src={recipe.imageUrl} alt="" className="mb-6 max-h-[28rem] w-full rounded-2xl object-cover" onError={() => setImageFailed(true)} /> : <div className="mb-6 flex h-64 items-center justify-center rounded-2xl bg-orange-100 text-7xl" aria-hidden="true">🍲</div>}
    <p className="text-orange-800">{recipe.category.name}</p><h1 className="mt-2 break-words text-4xl font-bold">{recipe.title}</h1>
    <p className="mt-3 text-stone-600">{recipe.description}</p>
    <p className="mt-3 text-sm text-stone-500">{recipe.cookingTimeMinutes} menit · {recipe.servings} porsi</p>
    <div className="mt-5 flex flex-wrap gap-4">
      {user
        ? <button type="button" aria-pressed={recipe.isFavorited} onClick={() => void toggleFavorite()} className="rounded-lg border px-4 py-2 text-orange-800">{recipe.isFavorited ? '♥ Hapus dari favorit' : '♡ Simpan ke favorit'}</button>
        : <Link to="/login" state={loginState} className="rounded-lg border px-4 py-2 text-orange-800">♡ Simpan ke favorit</Link>}
      {user?.role === 'ADMIN' && <><Link className="rounded-lg border px-4 py-2 text-orange-800" to={`/admin/recipes/${recipe.id}/edit`}>Ubah resep</Link><button type="button" onClick={() => void deleteRecipe()} className="rounded-lg border px-4 py-2 text-red-700">Hapus resep</button></>}
    </div>
    {favoriteError && <p role="alert" className="mt-3 text-red-700">{favoriteError}</p>}
    <section className="mt-10"><h2 className="text-2xl font-semibold">Bahan</h2><ul className="mt-3 list-inside list-disc space-y-2">{recipe.ingredients.map((item, index) => <li key={`${item.name}-${index}`}>{item.quantity} {item.unit ?? ''} {item.name}</li>)}</ul></section>
    <section className="mt-10"><h2 className="text-2xl font-semibold">Cara membuat</h2><ol className="mt-3 list-inside list-decimal space-y-3">{recipe.instructions.map((step) => <li key={step.stepNumber}>{step.description}</li>)}</ol></section>
  </main>;
}

export function FavoritesPage() {
  useDocumentTitle('Resep favorit');
  const { user } = useAuth();
  const [page, setPage] = useState<Page | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState('');
  useEffect(() => {
    setError('');
    void userApi.favorites({ page: pageNumber, size: 12, sort: 'newest' }).then((result) => {
      if (result.data) setPage(result.data);
      else setError(result.error?.message ?? 'Favorit gagal dimuat.');
    });
  }, [pageNumber, user?.id]);
  async function removeFavorite(recipe: RecipeSummary) {
    if (!page) return;
    const previousPage = page;
    setPage({ ...page, content: page.content.filter((entry) => entry.id !== recipe.id), totalElements: Math.max(0, page.totalElements - 1) });
    const result = await recipeApi.unfavorite(recipe.id);
    if (result.error) { setPage(previousPage); setError(result.error.message); }
  }
  async function deleteFavoriteRecipe(recipe: RecipeSummary) {
    if (!window.confirm(`Hapus resep “${recipe.title}”?`)) return;
    const result = await recipeApi.remove(recipe.id);
    if (result.error) { setError(result.error.message); return; }
    if (page?.content.length === 1 && page.page > 1) setPageNumber(page.page - 1);
    else setPage((current) => current && ({ ...current, content: current.content.filter((entry) => entry.id !== recipe.id), totalElements: Math.max(0, current.totalElements - 1) }));
  }
  return <main className="mx-auto max-w-6xl px-5 py-10"><h1 className="text-3xl font-bold">Resep favorit</h1>
    {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    {page?.content.length === 0 && <p className="mt-6">Belum ada resep favorit.</p>}
    <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{page?.content.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} signedIn isAdmin={user?.role === 'ADMIN'} onFavorite={(item) => void removeFavorite(item)} onDelete={(item) => void deleteFavoriteRecipe(item)} />)}</div>
    {page && <Pagination page={page} onPage={setPageNumber} />}
  </main>;
}
