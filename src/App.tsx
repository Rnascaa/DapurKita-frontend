import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createBrowserRouter, Link, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { authApi, clearSession, updateSessionUser, userApi } from './api';
import { AuthProvider, useAuth } from './features/auth/AuthProvider';
import { RequireAdmin, RequireUser } from './features/auth/RouteGuards';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { HomePage } from './pages/HomePage';
import { FavoritesPage, RecipeDetailPage, RecipeListPage } from './pages/RecipePages';
import { RecipeEditorPage } from './pages/RecipeEditorPage';
import { profileSchema } from './features/auth/validation';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import type { components } from './api/generated/openapi';

function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [location.key]);
  async function logout() {
    setLogoutBusy(true);
    await authApi.logout();
    clearSession();
    setLogoutBusy(false);
    setMenuOpen(false);
  }
  return <div className="flex min-h-screen flex-col">
    <header className="border-b border-stone-200 bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 py-4">
        <Link to="/" className="text-xl font-bold text-orange-800">DapurKita</Link>
        <button type="button" className="rounded-lg border px-3 py-1 md:hidden" aria-expanded={menuOpen} aria-controls="menu-utama" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? 'Tutup' : 'Menu'}</button>
        <div id="menu-utama" className={`${menuOpen ? 'flex' : 'hidden'} w-full min-w-0 flex-col items-start gap-3 md:flex md:w-auto md:flex-row md:items-center md:gap-5`}>
          <Link to="/recipes">Resep</Link>
          {user && <Link to="/favorites">Favorit</Link>}
          {user?.role === 'ADMIN' && <Link to="/admin/recipes/new">Tambah resep</Link>}
          {user ? <><Link to="/profile" className="max-w-full truncate md:max-w-48">{user.name}</Link><button disabled={logoutBusy} onClick={logout}>Keluar</button></> : <><Link to="/login">Masuk</Link><Link to="/register">Daftar</Link></>}
        </div>
      </nav>
    </header>
    <div className="flex-1"><Outlet /></div>
    <footer className="border-t border-stone-200 bg-white">
      <p className="mx-auto max-w-6xl px-5 py-6 text-sm text-stone-600">© {new Date().getFullYear()} DapurKita · Temukan resep, ciptakan rasa.</p>
    </footer>
  </div>;
}

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
  return <main className="mx-auto max-w-3xl px-5 py-10"><h1 className="text-3xl font-bold">Profil</h1>
    <form onSubmit={submit} noValidate className="mt-6 max-w-md space-y-4">
      <label className="block">Nama<input className="mt-1 w-full rounded-lg border-stone-300" value={name} minLength={2} maxLength={100} onChange={(event) => setName(event.target.value)} />{nameError && <span role="alert" className="text-sm text-red-700">{nameError}</span>}</label>
      <label className="block">Email<input readOnly className="mt-1 w-full rounded-lg border-stone-300 bg-stone-100" value={user?.email ?? ''} /></label>
      {formError && <p role="alert" className="text-red-700">{formError}</p>}{saved && <p role="status" className="text-green-700">Profil tersimpan.</p>}
      <button disabled={busy} className="rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Menyimpan…' : 'Simpan nama'}</button>
    </form>
  </main>;
}
function NotFound() { useDocumentTitle('Halaman tidak ditemukan'); return <main className="mx-auto max-w-4xl px-5 py-12"><h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1><Link className="mt-4 inline-block text-orange-800" to="/">Kembali ke beranda</Link></main>; }

const router = createBrowserRouter([
  {
    element: <AuthProvider />,
    children: [{
      element: <Layout />,
      children: [
        { path: '/', element: <HomePage /> },
        { path: '/recipes', element: <RecipeListPage /> },
        { path: '/recipes/:id', element: <RecipeDetailPage /> },
        { path: '/login', element: <LoginPage /> },
        { path: '/register', element: <RegisterPage /> },
        { element: <RequireUser />, children: [
          { path: '/favorites', element: <FavoritesPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { element: <RequireAdmin />, children: [
            { path: '/admin/recipes/new', element: <RecipeEditorPage /> },
            { path: '/admin/recipes/:id/edit', element: <RecipeEditorPage /> },
          ] },
        ] },
        { path: '*', element: <NotFound /> },
      ],
    }],
  },
]);

export function App() { return <RouterProvider router={router} />; }
