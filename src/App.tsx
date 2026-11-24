import { useRef, useState, type FormEvent } from 'react';
import { createBrowserRouter, Link, RouterProvider } from 'react-router-dom';
import { updateSessionUser, userApi } from './api';
import { AuthProvider, useAuth } from './features/auth/AuthProvider';
import { RequireAdmin, RequireUser } from './features/auth/RouteGuards';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { HomePage } from './pages/HomePage';
import { FavoritesPage, RecipeDetailPage, RecipeListPage } from './pages/RecipePages';
import { RecipeEditorPage } from './pages/RecipeEditorPage';
import { ArticleDetailPage, ArticleListPage } from './pages/ArticlePages';
import { ArticleEditorPage } from './pages/ArticleEditorPage';
import { MenuPage } from './pages/MenuPage';
import { AboutPage } from './pages/AboutPage';
import { profileSchema } from './features/auth/validation';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import type { components } from './api/generated/openapi';
import { Layout } from './components/Layout';
import { BackdropPhoto, PageHeader } from './components/Decor';
import { HEADER_OFFSET, photo } from './lib/photos';

function ProfilePage() {
  useDocumentTitle('Profil');
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [nameError, setNameError] = useState('');
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setNameError(''); setFormError(''); setSaved(false);
    const parsed = profileSchema.safeParse({ name });
    if (!parsed.success) { setNameError(parsed.error.issues[0]?.message ?? 'Nama tidak valid.'); return; }
    submitting.current = true; setBusy(true);
    try {
      const result = await userApi.updateProfile(parsed.data);
      if (result.error) {
        const error = result.error as components['schemas']['ErrorResponse'];
        if (error.code === 'VALIDATION_ERROR') setNameError(error.errors?.find((item) => item.field === 'name')?.message ?? error.message);
        else setFormError(error.message);
      } else if (result.data) { updateSessionUser(result.data); setName(result.data.name); setSaved(true); }
    } catch {
      setFormError('Tidak dapat terhubung ke server. Coba lagi.');
    } finally {
      submitting.current = false; setBusy(false);
    }
  }
  return <main>
    <PageHeader eyebrow="Akun" title="Profil" image={photo('daun-oranye')}>Atur nama yang tampil di DapurKita.</PageHeader>
    <div className="page py-14">
      <form onSubmit={submit} noValidate className="mx-auto max-w-lg space-y-5 bg-sage p-6 sm:p-10">
        <label className="field-label">Nama<input className="field" value={name} minLength={2} maxLength={100} onChange={(event) => setName(event.target.value)} />{nameError && <span role="alert" className="field-error">{nameError}</span>}</label>
        <label className="field-label">Email<input readOnly className="field bg-white/60 text-graphite" value={user?.email ?? ''} /></label>
        {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}{saved && <p role="status" className="text-sm font-bold text-olive">Profil tersimpan.</p>}
        <button disabled={busy} className="btn-dark w-full">{busy ? 'Menyimpan…' : 'Simpan nama'}</button>
      </form>
    </div>
  </main>;
}

/** Halaman 404 (desain "Coming Soon"). */
function NotFound() {
  useDocumentTitle('Halaman tidak ditemukan');
  return <main className={`relative flex min-h-screen items-center overflow-hidden bg-forest text-white ${HEADER_OFFSET}`}>
    <BackdropPhoto src={photo('botol')} className="absolute inset-0 h-full w-full" />
    <div className="absolute inset-0 bg-forest/70" aria-hidden="true" />
    <div className="page relative py-24 text-center">
      <p className="font-serif text-4xl uppercase tracking-[0.25em] sm:text-6xl">Tidak ditemukan</p>
      <div className="mx-auto mt-6 max-w-xl border-t-2 border-dotted border-white/50 pt-6">
        <p className="font-sans text-7xl font-bold sm:text-8xl">404</p>
        <h1 className="mt-2 text-sm font-normal text-white/80">Halaman yang kamu cari tidak ada atau sudah dipindahkan.</h1>
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-4"><Link className="btn-light" to="/">Kembali ke beranda</Link><Link className="btn-light" to="/menu">Lihat menu</Link></div>
    </div>
  </main>;
}

const router = createBrowserRouter([
  {
    element: <AuthProvider />,
    children: [{
      element: <Layout />,
      children: [
        { path: '/', element: <HomePage /> },
        { path: '/menu', element: <MenuPage /> },
        { path: '/recipes', element: <RecipeListPage /> },
        { path: '/recipes/:id', element: <RecipeDetailPage /> },
        { path: '/artikel', element: <ArticleListPage /> },
        { path: '/artikel/:id', element: <ArticleDetailPage /> },
        { path: '/tentang', element: <AboutPage /> },
        { path: '/login', element: <LoginPage /> },
        { path: '/register', element: <RegisterPage /> },
        { element: <RequireUser />, children: [
          { path: '/favorites', element: <FavoritesPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { element: <RequireAdmin />, children: [
            { path: '/admin/recipes/new', element: <RecipeEditorPage /> },
            { path: '/admin/recipes/:id/edit', element: <RecipeEditorPage /> },
            { path: '/admin/artikel/baru', element: <ArticleEditorPage /> },
            { path: '/admin/artikel/:id/ubah', element: <ArticleEditorPage /> },
          ] },
        ] },
        { path: '*', element: <NotFound /> },
      ],
    }],
  },
]);

export function App() { return <RouterProvider router={router} />; }
