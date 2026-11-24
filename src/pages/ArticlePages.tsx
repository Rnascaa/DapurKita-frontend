import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { articleApi } from '../api';
import type { components } from '../api/generated/openapi';
import { useAuth } from '../features/auth/AuthProvider';
import { ARTICLE_CATEGORIES, articleCategoryLabel, isArticleCategory, paragraphs } from '../features/articles/validation';
import { parseRecipeId as parseId } from '../features/recipes/validation';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Arrow, Avatar, formatDate, PageHeader, Photo } from '../components/Decor';
import { Pagination } from '../components/Pagination';
import { HEADER_OFFSET, photo } from '../lib/photos';

type ArticleSummary = components['schemas']['ArticleSummary'];
type ArticleDetail = components['schemas']['ArticleDetail'];
type ArticlePage = components['schemas']['ArticlePage'];
type ArticleFacets = components['schemas']['ArticleFacets'];

const CONNECTION_ERROR = 'Tidak dapat terhubung ke server. Coba lagi.';

function Meta({ article, light = false }: { article: ArticleSummary; light?: boolean }) {
  return <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${light ? 'text-white/80' : 'text-olive'}`}>
    <Avatar name={article.author.name} size="h-7 w-7 text-xs" />
    <span>{article.author.name}</span><span aria-hidden="true">•</span>
    <span>{formatDate(article.publishedAt)}</span><span aria-hidden="true">•</span>
    <span>{article.readingTimeMinutes} menit baca</span>
  </p>;
}

/** Kartu artikel (Blog Archive). `featured` memakai tata letak satu kolom yang lebar. */
export function ArticleCard({ article, featured = false }: { article: ArticleSummary; featured?: boolean }) {
  return <article className={featured ? 'grid gap-8 lg:grid-cols-2 lg:items-center' : 'flex flex-col'}>
    <Link to={`/artikel/${article.id}`} className="relative block" tabIndex={-1} aria-hidden="true">
      <Photo src={article.coverImageUrl} large={featured} className={`w-full ${featured ? 'aspect-[16/10]' : 'aspect-square sm:aspect-[4/3]'}`} />
      <span className="absolute right-4 top-4 bg-olive px-3 py-1 font-serif text-sm text-white">{articleCategoryLabel(article.category)}</span>
    </Link>
    <div className={featured ? '' : 'flex flex-1 flex-col px-0 pt-6 sm:px-6'}>
      <Meta article={article} />
      <h2 className={`dotted mt-4 break-words pb-3 font-serif leading-tight ${featured ? 'text-4xl sm:text-5xl' : 'text-2xl'}`}>
        <Link to={`/artikel/${article.id}`} className="hover:text-olive">{article.title}</Link>
      </h2>
      {article.excerpt && <p className={`mt-3 text-graphite ${featured ? '' : 'text-sm'}`}>{article.excerpt}</p>}
      <Link to={`/artikel/${article.id}`} className="link-arrow mt-5 self-start">Baca selengkapnya <Arrow /></Link>
    </div>
  </article>;
}

export function ArticleListPage() {
  useDocumentTitle('Artikel');
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCategory = searchParams.get('category');
  const category = isArticleCategory(rawCategory) ? rawCategory : undefined;
  const tag = searchParams.get('tag') ?? undefined;
  const q = searchParams.get('q') ?? '';
  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const [result, setResult] = useState<ArticlePage | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(q);
  useEffect(() => { setDraft(q); }, [q]);

  useEffect(() => {
    let active = true;
    setError('');
    articleApi.list({ page, size: 7, category, tag, q: q.trim() || undefined }).then((response) => {
      if (!active) return;
      if (response.data) setResult(response.data); else setError(response.error?.message ?? 'Artikel gagal dimuat.');
    }).catch(() => { if (active) setError(CONNECTION_ERROR); });
    return () => { active = false; };
  }, [page, category, tag, q]);

  function update(next: { category?: string | null; tag?: string | null; q?: string; page?: number }) {
    const params = new URLSearchParams();
    const nextCategory = next.category === undefined ? category : next.category;
    const nextTag = next.tag === undefined ? tag : next.tag;
    const nextQ = next.q ?? q;
    if (nextCategory) params.set('category', nextCategory);
    if (nextTag) params.set('tag', nextTag);
    if (nextQ.trim()) params.set('q', nextQ.trim());
    if ((next.page ?? 1) > 1) params.set('page', String(next.page));
    setSearchParams(params);
  }
  const tabClass = (active: boolean) => `whitespace-nowrap border-b-2 border-dotted pb-1 text-sm transition-colors hover:text-olive ${active ? 'border-black font-bold text-black' : 'border-transparent text-graphite'}`;
  const [first, ...rest] = result?.content ?? [];
  const showFeatured = page === 1 && first;
  return <main>
    <PageHeader eyebrow="Bacaan dapur" title="Artikel">Tips, cerita, dan teknik memasak untuk menemani resep favoritmu.</PageHeader>
    <div className="page py-12 sm:py-16">
      <nav aria-label="Jejak halaman" className="mb-10 text-sm text-silver"><Link to="/" className="hover:text-olive">Beranda</Link> / <span className="text-black">Artikel</span></nav>
      <div className="flex flex-col items-center gap-8">
        <div role="group" aria-label="Filter kategori artikel" className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          <button type="button" aria-pressed={!category} className={tabClass(!category)} onClick={() => update({ category: null })}>Semua</button>
          {ARTICLE_CATEGORIES.map((item) => <button key={item.value} type="button" aria-pressed={category === item.value} className={tabClass(category === item.value)} onClick={() => update({ category: item.value })}>{item.label}</button>)}
        </div>
        <form role="search" onSubmit={(event) => { event.preventDefault(); update({ q: draft }); }} className="flex w-full max-w-md">
          <label className="sr-only" htmlFor="cari-artikel">Cari artikel</label>
          <input id="cari-artikel" className="field mt-0 min-w-0 flex-1" placeholder="Cari judul artikel…" value={draft} onChange={(event) => setDraft(event.target.value)} />
          <button className="btn-dark -ml-px shrink-0 px-5">Cari</button>
        </form>
        {(tag || q) && <p className="text-sm text-graphite">
          {tag && <>Tag <strong className="text-black">#{tag}</strong> </>}{q && <>Kata kunci <strong className="text-black">“{q}”</strong> </>}
          <button type="button" onClick={() => update({ tag: null, q: '' })} className="ml-2 font-bold text-olive hover:underline">Hapus filter</button>
        </p>}
        {user?.role === 'ADMIN' && <Link to="/admin/artikel/baru" className="btn-primary btn-sm">+ Tulis artikel</Link>}
      </div>
      {error && <p role="alert" className="mt-10 text-red-700">{error}</p>}
      {!result && !error && <p className="mt-10 text-graphite">Memuat artikel…</p>}
      {result?.content.length === 0 && <p className="mt-12 text-center text-graphite">Belum ada artikel yang cocok.</p>}
      {showFeatured && <div className="mt-14"><ArticleCard article={first} featured /></div>}
      <div className="mt-16 grid gap-x-8 gap-y-16 sm:grid-cols-2">
        {(showFeatured ? rest : result?.content ?? []).map((article) => <ArticleCard key={article.id} article={article} />)}
      </div>
      {result && <Pagination page={result.page} totalPages={result.totalPages} onPage={(next) => update({ page: next })} label="Navigasi halaman artikel" />}
    </div>
  </main>;
}

function Sidebar() {
  const navigate = useNavigate();
  const [facets, setFacets] = useState<ArticleFacets | null>(null);
  const [recent, setRecent] = useState<ArticleSummary[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => {
    articleApi.facets().then((result) => { if (result.data) setFacets(result.data); }).catch(() => undefined);
    articleApi.list({ page: 1, size: 4 }).then((result) => { if (result.data) setRecent(result.data.content); }).catch(() => undefined);
  }, []);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(q.trim() ? `/artikel?q=${encodeURIComponent(q.trim())}` : '/artikel');
  }
  const heading = 'dotted pb-3 text-2xl';
  return <aside className="space-y-14">
    <form role="search" onSubmit={search} className="flex border-b border-black">
      <label htmlFor="cari-sidebar" className="sr-only">Cari artikel</label>
      <input id="cari-sidebar" className="min-w-0 flex-1 border-0 px-0 py-2 text-sm focus:ring-0" placeholder="Cari…" value={q} onChange={(event) => setQ(event.target.value)} />
      <button aria-label="Cari" className="px-2 hover:text-olive"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg></button>
    </form>
    {facets && <section>
      <h2 className={heading}>Kategori</h2>
      <ul className="mt-5 space-y-3 text-sm">{facets.categories.map((item) => <li key={item.category}>
        <Link to={`/artikel?category=${item.category}`} className="flex justify-between hover:text-olive"><span>{articleCategoryLabel(item.category)}</span><span>{item.count}</span></Link>
      </li>)}</ul>
    </section>}
    {recent.length > 0 && <section>
      <h2 className={heading}>Artikel terbaru</h2>
      <ul className="mt-5 space-y-5">{recent.map((article) => <li key={article.id}>
        <Link to={`/artikel/${article.id}`} className="group grid grid-cols-[4rem_1fr] gap-3">
          <Photo src={article.coverImageUrl} className="aspect-square w-16" />
          <span><span className="block font-serif leading-snug group-hover:text-olive">{article.title}</span><span className="text-xs text-silver">{formatDate(article.publishedAt)}</span></span>
        </Link>
      </li>)}</ul>
    </section>}
    {facets && facets.tags.length > 0 && <section>
      <h2 className={heading}>Tag</h2>
      <ul className="mt-5 flex flex-wrap gap-2">{facets.tags.map((item) => <li key={item.name}><Link to={`/artikel?tag=${encodeURIComponent(item.name)}`} className="block border border-black px-3 py-1 text-xs hover:bg-sage">{item.name}</Link></li>)}</ul>
    </section>}
  </aside>;
}

export function ArticleDetailPage() {
  const { id } = useParams();
  const articleId = parseId(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'notFound' | 'error' | 'ready'>('loading');
  const [error, setError] = useState('');
  useDocumentTitle(status === 'notFound' || articleId === null ? 'Artikel tidak ditemukan' : article?.title ?? 'Memuat artikel');
  useEffect(() => {
    if (articleId === null) { setStatus('notFound'); return; }
    let active = true;
    setStatus('loading');
    articleApi.detail(articleId).then((result) => {
      if (!active) return;
      if (result.data) { setArticle(result.data); setStatus('ready'); window.scrollTo(0, 0); }
      else if (result.response.status === 404) setStatus('notFound');
      else { setError(result.error?.message ?? 'Artikel gagal dimuat.'); setStatus('error'); }
    }).catch(() => { if (active) { setError(CONNECTION_ERROR); setStatus('error'); } });
    return () => { active = false; };
  }, [articleId]);
  async function remove() {
    if (!article || !window.confirm(`Hapus artikel “${article.title}”?`)) return;
    const result = await articleApi.remove(article.id).catch(() => null);
    if (!result || result.error) { setError(result?.error?.message ?? CONNECTION_ERROR); return; }
    navigate('/artikel', { replace: true });
  }
  if (status === 'notFound') return <main className="page py-24 text-center"><h1 role="alert" className="text-4xl sm:text-5xl">Artikel tidak ditemukan</h1><Link className="btn-outline mt-8" to="/artikel">Kembali ke daftar artikel</Link></main>;
  if (status === 'error') return <main className="page py-24 text-center"><h1 role="alert" className="text-4xl">{error}</h1><Link className="btn-outline mt-8" to="/artikel">Kembali ke daftar artikel</Link></main>;
  if (status === 'loading' || !article) return <main className="page py-24 text-center text-graphite">Memuat artikel…</main>;
  const [lead, ...body] = paragraphs(article.content);
  return <main>
    <section className={`relative overflow-hidden bg-forest text-white ${HEADER_OFFSET}`}>
      <Photo src={article.coverImageUrl ?? photo('kubis')} dark large className="absolute inset-0 h-full w-full opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/80 to-forest/30" aria-hidden="true" />
      <div className="page relative py-20 sm:py-28">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">{articleCategoryLabel(article.category)}</p>
        <h1 className="mt-4 max-w-3xl break-words text-4xl leading-tight sm:text-6xl">{article.title}</h1>
        <div className="mt-8"><Meta article={article} light /></div>
      </div>
    </section>
    <div className="page grid gap-14 py-12 sm:py-16 lg:grid-cols-[1fr_17rem]">
      <article className="min-w-0">
        <nav aria-label="Jejak halaman" className="text-sm text-silver"><Link to="/" className="hover:text-olive">Beranda</Link> / <Link to="/artikel" className="hover:text-olive">Artikel</Link> / <span className="text-black">{article.title}</span></nav>
        {lead && <p className="mt-8 text-lg leading-relaxed">{lead}</p>}
        {article.coverImageUrl && <Photo src={article.coverImageUrl} className="mt-10 aspect-[16/9] w-full" />}
        {article.excerpt && <blockquote className="relative my-12 py-4 pl-6 sm:pl-10">
          <span className="pointer-events-none absolute -top-10 right-0 font-serif text-[10rem] leading-none text-sage" aria-hidden="true">”</span>
          <p className="relative text-xl font-bold italic leading-relaxed text-olive sm:text-2xl">“{article.excerpt}”</p>
        </blockquote>}
        <div className="space-y-6 leading-relaxed text-graphite">{body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        {article.tags.length > 0 && <div className="mt-12 flex flex-wrap items-center gap-3">
          <span className="font-serif text-xl">Tag:</span>
          {article.tags.map((tag) => <Link key={tag} to={`/artikel?tag=${encodeURIComponent(tag)}`} className="border border-black px-3 py-1 text-xs hover:bg-sage">{tag}</Link>)}
        </div>}
        <div className="mt-12 flex items-center gap-5 border-t border-dotted border-black/40 pt-8">
          <Avatar name={article.author.name} size="h-20 w-20 text-2xl" />
          <div><p className="font-serif text-xl">{article.author.name}</p><p className="mt-1 text-sm text-graphite">Penulis di DapurKita. Diperbarui {formatDate(article.updatedAt)}.</p></div>
        </div>
        {user?.role === 'ADMIN' && <div className="mt-8 flex gap-3"><Link className="btn-outline btn-sm" to={`/admin/artikel/${article.id}/ubah`}>Ubah artikel</Link><button type="button" onClick={() => void remove()} className="btn-danger btn-sm">Hapus artikel</button></div>}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      </article>
      <Sidebar />
    </div>
    {(article.previous || article.next) && <nav aria-label="Artikel lain" className="grid sm:grid-cols-2">
      {[{ link: article.previous, label: 'Artikel sebelumnya', left: true }, { link: article.next, label: 'Artikel berikutnya', left: false }].map(({ link, label, left }) => link
        ? <Link key={label} to={`/artikel/${link.id}`} className="group relative flex min-h-52 items-center justify-center overflow-hidden bg-forest px-8 py-12 text-center text-white">
          <Photo src={link.coverImageUrl} dark className="absolute inset-0 h-full w-full opacity-40 transition-transform duration-500 group-hover:scale-105" />
          <span className="relative">
            <span className="flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em]">{left && <Arrow left />}{label}{!left && <Arrow />}</span>
            <span className="mt-3 block font-serif text-2xl">{link.title}</span>
          </span>
        </Link>
        : <div key={label} className="hidden bg-forest sm:block" />)}
    </nav>}
  </main>;
}
