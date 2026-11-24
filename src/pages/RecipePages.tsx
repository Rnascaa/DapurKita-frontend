import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { categoryApi, recipeApi, userApi } from '../api';
import { useAuth } from '../features/auth/AuthProvider';
import type { components } from '../api/generated/openapi';
import { RecipeNotFound } from '../features/recipes/RecipeNotFound';
import { parseRecipeId } from '../features/recipes/validation';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Arrow, Heart, PageHeader, Photo, Stars } from '../components/Decor';
import { Pagination } from '../components/Pagination';
import { CommentsSection, ReviewsSection } from './RecipeCommunity';
import { categoryPhoto, HEADER_OFFSET, photo } from '../lib/photos';

const slugify = (name: string) => name.toLowerCase().trim().replace(/s+/g, '-');

type RecipeSummary = components['schemas']['RecipeSummary'];
type RecipeDetail = components['schemas']['RecipeDetail'];
type Page = components['schemas']['RecipePage'];
type Category = components['schemas']['Category'];

function useLoginState() {
  const location = useLocation();
  return { from: `${location.pathname}${location.search}${location.hash}` };
}

export function RatingLine({ recipe, light = false }: { recipe: Pick<RecipeSummary, 'ratingAverage' | 'ratingCount'>; light?: boolean }) {
  if (recipe.ratingAverage === null || recipe.ratingCount === 0) return <span className={`text-xs ${light ? 'text-white/70' : 'text-graphite'}`}>Belum ada ulasan</span>;
  return <span className={`inline-flex items-center gap-2 text-xs ${light ? 'text-white/80' : 'text-graphite'}`}>
    <span className={light ? 'text-lime' : ''}><Stars value={recipe.ratingAverage} size="h-3.5 w-3.5" /></span>
    {recipe.ratingAverage.toFixed(1)} ({recipe.ratingCount})
  </span>;
}

function FavoriteButton({ recipe, signedIn, onFavorite, className }: { recipe: RecipeSummary; signedIn: boolean; onFavorite: (recipe: RecipeSummary) => void; className: string }) {
  const loginState = useLoginState();
  return signedIn
    ? <button type="button" aria-pressed={recipe.isFavorited} aria-label={recipe.isFavorited ? `Hapus ${recipe.title} dari favorit` : `Simpan ${recipe.title} ke favorit`} onClick={() => onFavorite(recipe)} className={className}><Heart filled={recipe.isFavorited} /></button>
    : <Link to="/login" state={loginState} aria-label="Masuk untuk menyimpan ke favorit" className={className}><Heart filled={false} /></Link>;
}

/** Kartu bergaya artikel (Blog Archive): dipakai di favorit dan beranda. */
export function RecipeCard({ recipe, signedIn, isAdmin, onFavorite, onDelete }: {
  recipe: RecipeSummary; signedIn: boolean; isAdmin: boolean;
  onFavorite: (recipe: RecipeSummary) => void; onDelete?: (recipe: RecipeSummary) => void;
}) {
  return <article className="flex flex-col">
    <Link to={`/recipes/${recipe.id}`} className="relative block" tabIndex={-1} aria-hidden="true">
      <Photo src={recipe.imageUrl} className="aspect-[4/3] w-full" />
      <span className="absolute right-4 top-4 bg-olive px-3 py-1 font-serif text-sm text-white">{recipe.category.name}</span>
    </Link>
    <div className="flex flex-1 flex-col pt-5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-olive"><span>{recipe.cookingTimeMinutes} menit · {recipe.servings} porsi</span><RatingLine recipe={recipe} /></p>
      <div className="dotted mt-3 flex items-start justify-between gap-3 pb-3">
        <Link to={`/recipes/${recipe.id}`} className="min-w-0 break-words font-serif text-2xl leading-tight hover:text-olive">{recipe.title}</Link>
        <FavoriteButton recipe={recipe} signedIn={signedIn} onFavorite={onFavorite} className="flex h-10 w-10 shrink-0 items-center justify-center border border-black/20 text-olive transition-colors hover:border-olive hover:bg-sage" />
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-graphite">{recipe.description}</p>
      <Link to={`/recipes/${recipe.id}`} className="link-arrow mt-4 self-start">Lihat resep <Arrow /></Link>
      {isAdmin && <div className="mt-5 flex gap-3"><Link className="btn-outline btn-sm" to={`/admin/recipes/${recipe.id}/edit`}>Ubah</Link><button type="button" className="btn-danger btn-sm" onClick={() => onDelete?.(recipe)}>Hapus</button></div>}
    </div>
  </article>;
}

/** Kartu foto bergaya Portfolio: judul di atas foto dengan bayangan gelap. */
function RecipeTile({ recipe, wide, signedIn, onFavorite }: { recipe: RecipeSummary; wide: boolean; signedIn: boolean; onFavorite: (recipe: RecipeSummary) => void }) {
  return <article className={`group relative h-80 overflow-hidden bg-forest text-white sm:h-96 ${wide ? 'lg:col-span-2' : ''}`}>
    <Photo src={recipe.imageUrl} dark className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" aria-hidden="true" />
    <FavoriteButton recipe={recipe} signedIn={signedIn} onFavorite={onFavorite} className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center bg-white/90 text-olive transition-colors hover:bg-white" />
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
      <div className="min-w-0">
        <h2 className="break-words font-serif text-2xl leading-tight sm:text-3xl">
          <Link to={`/recipes/${recipe.id}`} className="after:absolute after:inset-0 hover:text-lime">{recipe.title}</Link>
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80"><span>{recipe.category.name} · {recipe.cookingTimeMinutes} menit</span><RatingLine recipe={recipe} light /></p>
      </div>
      <span className="shrink-0 text-white/80 group-hover:text-lime"><Arrow /></span>
    </div>
  </article>;
}

export function RecipeListPage() {
  useDocumentTitle('Jelajahi resep');
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [resultPage, setResultPage] = useState<Page | null>(null);
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
      }).catch(() => setError('Tidak dapat terhubung ke server. Coba lagi.'));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [query, categoryId, ingredients, pageNumber, user?.id]);
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
  function addIngredient() {
    const ingredient = ingredientDraft.trim();
    if (!ingredient) return;
    updateFilters({ ingredients: [...ingredients, ingredient] });
    setIngredientDraft('');
  }
  const tabClass = (active: boolean) => `whitespace-nowrap border-b-2 border-dotted pb-1 text-sm transition-colors hover:text-olive ${active ? 'border-black font-bold text-black' : 'border-transparent text-graphite'}`;
  return <main>
    <PageHeader eyebrow="Koleksi resep" title="Jelajahi resep" image={photo('salmon')}>Cari berdasarkan nama masakan, kategori, atau bahan yang ada di dapurmu.</PageHeader>
    <div className="page py-12 sm:py-16">
      {categories.length > 0 && <div role="group" aria-label="Filter kategori" className="flex flex-wrap justify-center gap-x-6 gap-y-3">
        <button type="button" aria-pressed={!categoryId} className={tabClass(!categoryId)} onClick={() => updateFilters({ categoryId: '' })}>Semua</button>
        {categories.map((category) => <button key={category.id} type="button" aria-pressed={categoryId === String(category.id)} className={tabClass(categoryId === String(category.id))} onClick={() => updateFilters({ categoryId: String(category.id) })}>{category.name}</button>)}
      </div>}
      <div className="mt-10 grid gap-4 bg-sage p-5 sm:grid-cols-2 sm:p-8">
        <label className="field-label">Nama masakan
          <input aria-label="Cari resep" className="field" placeholder="Cari nama masakan…" value={query} onChange={(e) => updateFilters({ query: e.target.value })} />
        </label>
        <form onSubmit={(event) => { event.preventDefault(); addIngredient(); }}>
          <label className="field-label" htmlFor="bahan-pencarian">Bahan</label>
          <div className="mt-2 flex">
            <input id="bahan-pencarian" aria-label="Tambah bahan pencarian" className="field mt-0 min-w-0 flex-1" placeholder="Cari bahan, mis. ayam" value={ingredientDraft} onChange={(event) => setIngredientDraft(event.target.value)} />
            <button type="submit" aria-label="Tambah bahan" className="btn-dark -ml-px shrink-0 px-4"><span className="sm:hidden">Tambah</span><span className="hidden sm:inline">Tambah bahan</span></button>
          </div>
        </form>
        {ingredients.length > 0 && <ul aria-label="Bahan pencarian terpilih" className="flex flex-wrap gap-2 sm:col-span-2">
          {ingredients.map((ingredient, index) => <li key={`${ingredient}-${index}`} className="flex items-center gap-2 border border-black bg-white px-3 py-1 text-sm">
            <span>{ingredient}</span><button type="button" aria-label={`Hapus filter bahan ${ingredient}`} onClick={() => updateFilters({ ingredients: ingredients.filter((_, itemIndex) => itemIndex !== index) })} className="font-bold text-olive hover:text-black">×</button>
          </li>)}
        </ul>}
      </div>
      {error && <p role="alert" className="mt-6 text-red-700">{error}</p>}
      {favoriteError && <p role="alert" className="mt-6 text-red-700">{favoriteError}</p>}
      {!resultPage && !error && <p className="mt-10 text-graphite">Memuat resep…</p>}
      {resultPage && <p className="mt-10 text-sm text-graphite" role="status">{resultPage.totalElements} resep ditemukan</p>}
      {resultPage?.content.length === 0 && <p className="mt-6 text-center text-graphite">Belum ada resep yang cocok.</p>}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {resultPage?.content.map((recipe, index) => <RecipeTile key={recipe.id} recipe={recipe} wide={index % 4 === 0 || index % 4 === 3} signedIn={Boolean(user)} onFavorite={(item) => void toggleFavorite(item)} />)}
      </div>
      {resultPage && <Pagination page={resultPage.page} totalPages={resultPage.totalPages} onPage={(page) => updateFilters({ page })} label="Navigasi halaman resep" />}
    </div>
  </main>;
}

export function RecipeDetailPage() {
  const { id } = useParams();
  const recipeId = parseRecipeId(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const loginState = useLoginState();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [favoriteError, setFavoriteError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
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
  }, [recipeId, user?.id, reloadKey]);
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
  if (!recipe || recipe.id !== recipeId) return <main className="page py-24 text-center text-graphite">Memuat resep…</main>;
  return <main>
    <section className={`relative flex min-h-[30rem] items-end overflow-hidden bg-forest text-white sm:min-h-[40rem] ${HEADER_OFFSET}`}>
      <Photo src={recipe.imageUrl ?? categoryPhoto(slugify(recipe.category.name))} dark large className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/60 to-forest/10" aria-hidden="true" />
      <div className="page relative py-12">
        <nav aria-label="Jejak halaman" className="text-sm text-white/70"><Link to="/" className="hover:text-lime">Beranda</Link> / <Link to="/recipes" className="hover:text-lime">Resep</Link> / <Link to={`/recipes?categoryId=${recipe.category.id}`} className="text-white hover:text-lime">{recipe.category.name}</Link></nav>
        <h1 className="mt-5 max-w-4xl break-words text-4xl leading-tight sm:text-7xl">{recipe.title}</h1>
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-dotted border-white/40 pt-6 text-sm">
          <div><dt className="text-xs uppercase tracking-[0.2em] text-lime">Waktu masak</dt><dd className="mt-1 font-serif text-xl">{recipe.cookingTimeMinutes} menit</dd></div>
          <div><dt className="text-xs uppercase tracking-[0.2em] text-lime">Porsi</dt><dd className="mt-1 font-serif text-xl">{recipe.servings} porsi</dd></div>
          <div><dt className="text-xs uppercase tracking-[0.2em] text-lime">Rating</dt><dd className="mt-2"><RatingLine recipe={recipe} light /></dd></div>
        </dl>
      </div>
    </section>
    <div className="page grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_18rem]">
      <div className="min-w-0">
        {recipe.description && <p className="font-serif text-2xl leading-relaxed text-olive sm:text-3xl">“{recipe.description}”</p>}
        <section className="mt-12">
          <h2 className="text-4xl sm:text-5xl">Bahan</h2>
          <ul className="mt-6">{recipe.ingredients.map((item, index) => <li key={`${item.name}-${index}`} className="dotted flex items-baseline justify-between gap-6 py-4">
            <span className="min-w-0 break-words font-serif text-xl">{item.name}</span>
            <span className="shrink-0 text-right text-sm font-bold text-olive">{item.quantity} {item.unit ?? ''}</span>
          </li>)}</ul>
        </section>
        <section className="mt-14">
          <h2 className="text-4xl sm:text-5xl">Cara membuat</h2>
          <ol className="mt-8 space-y-8">{recipe.instructions.map((step) => <li key={step.stepNumber} className="grid grid-cols-[3.5rem_1fr] gap-4">
            <span className="text-3xl font-bold leading-none text-olive" aria-hidden="true">{String(step.stepNumber).padStart(2, '0')}.</span>
            <p className="min-w-0 break-words pt-1 text-lg leading-relaxed"><span className="sr-only">Langkah {step.stepNumber}: </span>{step.description}</p>
          </li>)}</ol>
        </section>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <div className="bg-sage p-6">
          <h2 className="dotted pb-3 text-2xl">Simpan resep</h2>
          <p className="mt-3 text-sm text-graphite">Simpan ke favorit agar mudah dibuka lagi.</p>
          {user
            ? <button type="button" aria-pressed={recipe.isFavorited} onClick={() => void toggleFavorite()} className="btn-dark mt-5 w-full"><Heart filled={recipe.isFavorited} />{recipe.isFavorited ? 'Hapus dari favorit' : 'Simpan ke favorit'}</button>
            : <Link to="/login" state={loginState} className="btn-dark mt-5 w-full"><Heart filled={false} />Simpan ke favorit</Link>}
          {favoriteError && <p role="alert" className="mt-3 text-sm text-red-700">{favoriteError}</p>}
        </div>
        {user?.role === 'ADMIN' && <div className="border border-black/20 p-6">
          <h2 className="dotted pb-3 text-2xl">Kelola</h2>
          <div className="mt-5 flex flex-col gap-3"><Link className="btn-outline" to={`/admin/recipes/${recipe.id}/edit`}>Ubah resep</Link><button type="button" onClick={() => void deleteRecipe()} className="btn-danger">Hapus resep</button></div>
        </div>}
        <Link to="/recipes" className="link-arrow">Kembali ke daftar resep <Arrow /></Link>
      </aside>
    </div>
    <ReviewsSection recipe={recipe} onChanged={() => setReloadKey((key) => key + 1)} />
    <CommentsSection recipeId={recipe.id} />
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
  return <main>
    <PageHeader eyebrow="Koleksimu" title="Resep favorit" image={photo('kat-sayur')}>Semua resep yang kamu simpan ada di sini.</PageHeader>
    <div className="page py-12 sm:py-16">
      {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
      {!page && !error && <p className="text-graphite">Memuat favorit…</p>}
      {page?.content.length === 0 && <div className="bg-sage px-6 py-14 text-center">
        <p className="font-serif text-2xl">Belum ada resep favorit.</p>
        <Link to="/recipes" className="btn-dark mt-6">Jelajahi resep</Link>
      </div>}
      <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{page?.content.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} signedIn isAdmin={user?.role === 'ADMIN'} onFavorite={(item) => void removeFavorite(item)} onDelete={(item) => void deleteFavoriteRecipe(item)} />)}</div>
      {page && <Pagination page={page.page} totalPages={page.totalPages} onPage={setPageNumber} label="Navigasi halaman favorit" />}
    </div>
  </main>;
}
