import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryApi, recipeApi } from '../api';
import type { components } from '../api/generated/openapi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { LeafArt, PageHeader, Photo } from '../components/Decor';
import { IngredientSearchPanel } from '../components/IngredientSearchPanel';
import { categoryPhoto, photo } from '../lib/photos';

type RecipeSummary = components['schemas']['RecipeSummary'];
type Category = components['schemas']['Category'];

/** Semua resep, maksimal 5 halaman x 50 (cukup untuk koleksi DapurKita saat ini). */
async function loadAllRecipes() {
  const all: RecipeSummary[] = [];
  for (let page = 1; page <= 5; page++) {
    const result = await recipeApi.list({ page, size: 50, sort: 'title' });
    if (!result.data) throw new Error(result.error?.message ?? 'Resep gagal dimuat.');
    all.push(...result.data.content);
    if (!result.data.hasNext) break;
  }
  return all;
}

/** Halaman Menu (desain "Menu"): resep dikelompokkan per kategori, waktu masak menggantikan harga. */
export function MenuPage() {
  useDocumentTitle('Menu');
  const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    categoryApi.list().then((result) => { if (active && result.data) setCategories(result.data); }).catch(() => undefined);
    loadAllRecipes().then((items) => { if (active) setRecipes(items); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error && reason.message !== 'Failed to fetch' ? reason.message : 'Tidak dapat terhubung ke server. Coba lagi.'); });
    return () => { active = false; };
  }, []);
  const groups = categories.map((category) => ({ category, items: (recipes ?? []).filter((recipe) => recipe.category.id === category.id) })).filter((group) => group.items.length);
  return <main>
    <PageHeader eyebrow="Daftar menu" title="Menu DapurKita" image={photo('meja-kayu')}>Semua resep dalam satu halaman, dikelompokkan per kategori.</PageHeader>
    {groups.length > 1 && <nav aria-label="Lompat ke kategori" className="border-b border-dotted border-black/30">
      <ul className="page flex flex-wrap justify-center gap-x-6 gap-y-2 py-6 text-sm">{groups.map(({ category }) => <li key={category.id}><a href={`#kategori-${category.slug}`} className="hover:text-olive">{category.name}</a></li>)}</ul>
    </nav>}
    {error && <p role="alert" className="page py-12 text-red-700">{error}</p>}
    {!recipes && !error && <p className="page py-12 text-graphite">Memuat menu…</p>}
    {recipes?.length === 0 && <p className="page py-12 text-center text-graphite">Belum ada resep.</p>}
    {groups.map(({ category, items }, index) => {
      const image = items.find((recipe) => recipe.imageUrl)?.imageUrl ?? categoryPhoto(category.slug);
      return <section key={category.id} id={`kategori-${category.slug}`} aria-labelledby={`judul-${category.slug}`} className={`relative scroll-mt-8 overflow-hidden ${index % 2 ? 'bg-sage' : ''}`}>
        {index === 0 && <LeafArt className="pointer-events-none absolute -top-6 right-4 hidden h-52 w-52 text-olive/40 lg:block" />}
        <div className="page py-20 sm:py-24">
          <div className="text-center">
            <h2 id={`judul-${category.slug}`} className="text-5xl sm:text-6xl">{category.name}</h2>
            <p className="mt-3 text-sm text-graphite">{items.length} resep</p>
          </div>
          <div className={`mt-14 grid gap-14 lg:grid-cols-2 lg:items-start ${index % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
            <ul className="space-y-10">
              {items.map((recipe) => <li key={recipe.id}>
                <p className="dotted pb-1 text-right font-serif text-xl">{recipe.cookingTimeMinutes} mnt</p>
                <h3 className="mt-3 text-3xl leading-tight"><Link to={`/recipes/${recipe.id}`} className="hover:text-olive">{recipe.title}</Link></h3>
                <p className="mt-2 text-sm text-graphite">{recipe.description ?? `${recipe.servings} porsi`}</p>
              </li>)}
            </ul>
            <Photo src={image} large className="aspect-[4/5] w-full lg:sticky lg:top-8" />
          </div>
        </div>
      </section>;
    })}
    <IngredientSearchPanel />
  </main>;
}
