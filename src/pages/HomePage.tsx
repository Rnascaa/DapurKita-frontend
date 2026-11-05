import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryApi, recipeApi } from '../api';
import type { components } from '../api/generated/openapi';
import { useAuth } from '../features/auth/AuthProvider';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { RecipeCard } from './RecipePages';

type RecipeSummary = components['schemas']['RecipeSummary'];
type Category = components['schemas']['Category'];

export function HomePage() {
  useDocumentTitle();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [favoriteError, setFavoriteError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    recipeApi.list({ size: 6, sort: 'newest' }).then((result) => {
      if (!active) return;
      if (result.data) setRecipes(result.data.content);
      else setError(result.error?.message ?? 'Resep gagal dimuat.');
    }).catch(() => { if (active) setError('Tidak dapat terhubung ke server. Coba lagi.'); });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    categoryApi.list().then((result) => { if (active && result.data) setCategories(result.data); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  function setFavorited(id: number, isFavorited: boolean) {
    setRecipes((current) => current && current.map((item) => item.id === id ? { ...item, isFavorited } : item));
  }

  async function toggleFavorite(recipe: RecipeSummary) {
    setFavoriteError('');
    setFavorited(recipe.id, !recipe.isFavorited);
    const result = recipe.isFavorited ? await recipeApi.unfavorite(recipe.id) : await recipeApi.favorite(recipe.id);
    if (result.error) {
      setFavorited(recipe.id, recipe.isFavorited);
      setFavoriteError(result.error.message);
    }
  }

  return <main className="mx-auto max-w-6xl px-5 py-12">
    <p className="font-semibold text-orange-800">Temukan resep, ciptakan rasa.</p>
    <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">Masak masakan Indonesia, satu resep setiap kali.</h1>
    <p className="mt-5 max-w-xl text-lg text-stone-600">Temukan inspirasi dan simpan resep favorit untuk dicoba di rumah.</p>
    <Link className="mt-8 inline-block rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white" to="/recipes">Jelajahi resep</Link>

    {categories.length > 0 && <section className="mt-14">
      <h2 className="text-2xl font-semibold">Kategori</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((category) => <li key={category.id}>
          <Link to={`/recipes?categoryId=${category.id}`} className="block rounded-xl bg-white px-4 py-3 text-center font-medium shadow-sm ring-1 ring-stone-200 hover:text-orange-800">{category.name}</Link>
        </li>)}
      </ul>
    </section>}

    <section className="mt-14">
      <h2 className="text-2xl font-semibold">Resep terbaru</h2>
      {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
      {favoriteError && <p role="alert" className="mt-4 text-red-700">{favoriteError}</p>}
      {!recipes && !error && <p className="mt-4">Memuat resep…</p>}
      {recipes?.length === 0 && <p className="mt-4">Belum ada resep.</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {recipes?.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} signedIn={Boolean(user)} isAdmin={false} onFavorite={(item) => void toggleFavorite(item)} />)}
      </div>
    </section>
  </main>;
}
