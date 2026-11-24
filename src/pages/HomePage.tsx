import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { articleApi, categoryApi, recipeApi, reviewApi } from '../api';
import type { components } from '../api/generated/openapi';
import { useAuth } from '../features/auth/AuthProvider';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Arrow, Avatar, FeatureIcon, LeafArt, Photo, SectionTitle, Stars } from '../components/Decor';
import { IngredientSearchPanel } from '../components/IngredientSearchPanel';
import { ArticleCard } from './ArticlePages';
import { categoryPhoto, HEADER_OFFSET, photo } from '../lib/photos';

type RecipeSummary = components['schemas']['RecipeSummary'];
type Category = components['schemas']['Category'];
type ArticleSummary = components['schemas']['ArticleSummary'];
type FeaturedReview = components['schemas']['FeaturedReview'];

const features = [
  { icon: 'pot' as const, title: 'Resep rumahan', text: 'Masakan Indonesia yang bisa dibuat dengan peralatan dapur sehari-hari.' },
  { icon: 'leaf' as const, title: 'Bahan mudah didapat', text: 'Bahan tersedia di pasar dan warung, lengkap dengan takarannya.' },
  { icon: 'clock' as const, title: 'Langkah ringkas', text: 'Waktu masak jelas dan langkah yang mudah diikuti dari awal sampai saji.' },
];

function Testimonials({ reviews }: { reviews: FeaturedReview[] }) {
  const [index, setIndex] = useState(0);
  if (!reviews.length) return null;
  const review = reviews[index];
  return <section aria-labelledby="judul-ulasan-beranda" className="page relative py-16 sm:py-24">
    <h2 id="judul-ulasan-beranda" className="sr-only">Kata mereka</h2>
    <span className="pointer-events-none absolute right-6 top-4 font-serif text-[14rem] leading-none text-sage sm:right-20" aria-hidden="true">”</span>
    <figure className="relative max-w-4xl" aria-live="polite">
      <blockquote className="font-serif text-2xl leading-snug sm:text-4xl">“{review.content}”</blockquote>
      <figcaption className="mt-10 flex flex-wrap items-center gap-5">
        <Avatar name={review.author.name} size="h-16 w-16 text-xl" />
        <div>
          <p className="font-serif text-xl">{review.author.name}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-graphite"><Stars value={review.rating} size="h-3.5 w-3.5" label={`${review.rating} dari 5 bintang`} />untuk <Link to={`/recipes/${review.recipe.id}`} className="font-bold text-olive hover:underline">{review.recipe.title}</Link></p>
        </div>
      </figcaption>
    </figure>
    {reviews.length > 1 && <div className="relative mt-10 flex items-center justify-end gap-5">
      <button type="button" aria-label="Ulasan sebelumnya" onClick={() => setIndex((index - 1 + reviews.length) % reviews.length)} className="p-2 text-forest hover:text-olive"><Arrow left /></button>
      <span className="font-serif text-sm">{index + 1} / {reviews.length}</span>
      <button type="button" aria-label="Ulasan berikutnya" onClick={() => setIndex((index + 1) % reviews.length)} className="p-2 text-forest hover:text-olive"><Arrow /></button>
    </div>}
  </section>;
}

export function HomePage() {
  useDocumentTitle();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    recipeApi.list({ size: 12, sort: 'newest' }).then((result) => {
      if (!active) return;
      if (result.data) setRecipes(result.data.content);
      else setError(result.error?.message ?? 'Resep gagal dimuat.');
    }).catch(() => { if (active) setError('Tidak dapat terhubung ke server. Coba lagi.'); });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    categoryApi.list().then((result) => { if (active && result.data) setCategories(result.data); }).catch(() => undefined);
    articleApi.list({ page: 1, size: 2 }).then((result) => { if (active && result.data) setArticles(result.data.content); }).catch(() => undefined);
    reviewApi.featured(5).then((result) => { if (active && result.data) setReviews(result.data); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const featured = (recipes ?? []).slice(0, 4);

  return <main>
    <section className={`overflow-hidden bg-forest text-white ${HEADER_OFFSET}`}>
      {/* Baris 1 (desain Home > Header): judul menimpa foto, garis "Gulir" vertikal, tiga mangkuk di bawah foto. */}
      <div className="page relative grid gap-10 pb-24 pt-12 sm:grid-cols-[1fr_1fr] sm:items-start sm:pt-16">
        <div className="relative z-10 sm:pt-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">Temukan resep, ciptakan rasa</p>
          <h1 className="mt-5 text-5xl leading-[1.05] sm:-mr-28 sm:text-6xl lg:-mr-40 lg:text-7xl xl:text-8xl">Masakan rumah adalah bagian dari hidup.</h1>
          <p className="mt-6 max-w-sm text-sm text-white/80">Temukan resep masakan Indonesia, simpan favoritmu, dan bagikan pengalaman memasak bersama keluarga.</p>
          <div className="mt-8 flex flex-wrap gap-4"><Link className="btn-light" to="/recipes">Jelajahi resep <Arrow /></Link><Link className="btn border-lime bg-lime text-forest hover:border-white hover:bg-white" to="/menu">Lihat menu</Link></div>
          <a href="#resep-pilihan" className="mt-12 hidden w-fit flex-col items-center gap-4 text-white/80 hover:text-lime sm:flex">
            <span className="font-serif text-lg [writing-mode:vertical-rl]">Gulir</span>
            <span className="h-24 border-l border-dashed border-current" aria-hidden="true" />
          </a>
        </div>
        <div className="relative sm:mt-24">
          <Photo src={photo('hero-steak')} dark large className="aspect-[4/5] w-full" />
          <div className="absolute -bottom-12 right-4 flex gap-3 sm:right-auto sm:left-[-20%] lg:gap-5">
            {['bumbu-adas', 'bumbu-lada', 'bumbu-bubuk'].map((name) => <Photo key={name} src={photo(name)} dark className="h-20 w-20 rounded-full border-4 border-forest sm:h-24 sm:w-24 lg:h-32 lg:w-32" />)}
          </div>
        </div>
      </div>
      {/* Baris 2: foto kiri + ajakan, teks kecil + foto tinggi di kanan. */}
      <div className="page grid gap-10 pb-20 sm:grid-cols-[1.2fr_1fr] sm:gap-16 lg:pb-28">
        <div>
          <Photo src={photo('sup-kerang')} dark className="aspect-[4/3] w-full" />
          <h2 className="mt-8 text-4xl leading-tight">Mulai rencanakan menu masakanmu hari ini</h2>
          <p className="mt-4 max-w-sm text-sm text-white/80">Pilih resep untuk sepekan, simpan ke favorit, lalu belanja bahan sekali jalan.</p>
        </div>
        <div className="sm:pl-10">
          <p className="max-w-xs text-sm text-white/80">Setiap resep dilengkapi waktu masak, jumlah porsi, dan ulasan dari pengguna lain.</p>
          <Photo src={photo('gilingan-lada')} dark className="mt-8 aspect-[3/4] w-full" />
        </div>
      </div>
    </section>

    <section id="resep-pilihan" className="page scroll-mt-4 py-20 sm:py-28">
      <div className="relative">
        <LeafArt className="pointer-events-none absolute -top-16 right-0 hidden h-48 w-48 text-olive/40 sm:block" />
        <SectionTitle title="Resep pilihan" description="Hidangan terbaru dari dapur kami, siap dicoba hari ini." />
      </div>
      {error && <p role="alert" className="mt-6 text-red-700">{error}</p>}
      {!recipes && !error && <p className="mt-6 text-graphite">Memuat resep…</p>}
      {recipes?.length === 0 && <p className="mt-6 text-graphite">Belum ada resep.</p>}
      <ul className="mt-12 grid gap-x-12 gap-y-12 sm:grid-cols-2">
        {featured.map((recipe) => <li key={recipe.id}>
          <p className="dotted pb-1 text-right font-serif text-xl">{recipe.cookingTimeMinutes} mnt</p>
          <h3 className="mt-3 text-3xl leading-tight"><Link to={`/recipes/${recipe.id}`} className="hover:text-olive">{recipe.title}</Link></h3>
          <p className="mt-3 line-clamp-2 text-sm text-graphite">{recipe.description}</p>
        </li>)}
      </ul>
      <Link to="/menu" className="btn-outline mt-14">Lihat semua menu</Link>
    </section>

    <section className="relative overflow-hidden bg-sage">
      <LeafArt className="pointer-events-none absolute -left-10 top-10 h-56 w-56 text-black/30" />
      <LeafArt className="pointer-events-none absolute -bottom-10 right-0 hidden h-64 w-64 -scale-x-100 text-black/30 lg:block" />
      <div className="page relative grid gap-12 py-20 sm:py-28 lg:grid-cols-2 lg:items-center">
        <Photo src={photo('talenan-salmon')} large className="aspect-[4/3] w-full" />
        <div>
          <h2 className="text-5xl leading-tight sm:text-6xl">Dari dapur rumah ke meja makan</h2>
          <p className="mt-6 max-w-md text-graphite">DapurKita mengumpulkan resep yang biasa dimasak di rumah. Setiap resep ditulis ringkas, lengkap dengan bahan, takaran, dan langkahnya.</p>
          <Link to="/tentang" className="link-arrow mt-8">Kenali DapurKita <Arrow /></Link>
        </div>
      </div>
    </section>

    <section className="page grid gap-14 py-20 text-center sm:grid-cols-3 sm:py-28">
      {features.map((feature) => <div key={feature.title}>
        <span className="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-sage text-forest"><FeatureIcon name={feature.icon} /></span>
        <h3 className="mt-8 text-2xl">{feature.title}</h3>
        <p className="mx-auto mt-4 max-w-xs text-sm text-graphite">{feature.text}</p>
      </div>)}
    </section>

    {articles.length > 0 && <section className="page pb-20 sm:pb-28">
      <SectionTitle title="Artikel terbaru" description="Tips dan cerita untuk menemani waktu memasak.">
        <Link to="/artikel" className="link-arrow">Semua artikel <Arrow /></Link>
      </SectionTitle>
      <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2">{articles.map((article) => <ArticleCard key={article.id} article={article} />)}</div>
    </section>}

    <IngredientSearchPanel />

    {categories.length > 0 && <section className="page py-20 sm:py-28">
      <SectionTitle center title="Pilih kategori" description="Dari lauk sampai minuman, temukan hidangan yang kamu cari." />
      <ul className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => <li key={category.id}>
          <Link to={`/recipes?categoryId=${category.id}`} className="group relative block aspect-[5/7] overflow-hidden bg-sage">
            <Photo src={categoryPhoto(category.slug)} className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-white/90 to-transparent p-5 pb-12">
              <span className="font-serif text-2xl text-forest">{category.name}</span>
              <span className="pt-2 text-forest group-hover:text-olive"><Arrow /></span>
            </span>
          </Link>
        </li>)}
      </ul>
    </section>}

    <Testimonials reviews={reviews} />
  </main>;
}
