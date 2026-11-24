import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { authApi, clearSession } from '../api';
import { useAuth } from '../features/auth/AuthProvider';
import { ARTICLE_CATEGORIES } from '../features/articles/validation';
import { photo } from '../lib/photos';
import { BackdropPhoto } from './Decor';

/** Menu layar penuh (desain "Navigation - Fullscreen Cover"). */
function FullscreenMenu({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [onClose]);
  async function logout() {
    setLogoutBusy(true);
    await authApi.logout().catch(() => undefined);
    clearSession();
    setLogoutBusy(false);
    onClose();
  }
  const big = ({ isActive }: { isActive: boolean }) => `flex items-center gap-4 font-serif text-4xl uppercase leading-tight transition-colors hover:text-lime sm:text-6xl ${isActive ? 'text-lime' : ''}`;
  const main = [
    { to: '/', label: 'Beranda', end: true },
    { to: '/menu', label: 'Menu' },
    { to: '/recipes', label: 'Resep' },
    { to: '/artikel', label: 'Artikel' },
    { to: '/tentang', label: 'Tentang' },
  ];
  return <div role="dialog" aria-modal="true" aria-label="Menu utama" className="fixed inset-0 z-50 overflow-y-auto bg-forest text-white">
    <BackdropPhoto src={photo('daun-lembut')} className="pointer-events-none fixed inset-0 h-full w-full opacity-25" />
    <div className="page relative flex min-h-full flex-col py-6">
      <div className="flex items-center justify-between">
        <Link to="/" onClick={onClose} className="border border-white/70 px-3 py-1 font-serif text-2xl leading-tight">DapurKita</Link>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Tutup menu" className="flex h-11 w-11 items-center justify-center hover:text-lime">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>
      </div>
      <div className="grid flex-1 content-center gap-14 py-12 lg:grid-cols-[1.6fr_1fr] lg:items-center">
        <nav aria-label="Halaman">
          <ul className="space-y-4">
            {main.map((item) => <li key={item.to}>
              <NavLink to={item.to} end={item.end} onClick={onClose} className={big}><span className="text-2xl" aria-hidden="true">•</span>{item.label}</NavLink>
              {item.to === '/artikel' && <ul className="ml-10 mt-2 space-y-1 font-serif text-white/80">
                {ARTICLE_CATEGORIES.map((category) => <li key={category.value}><Link onClick={onClose} className="hover:text-lime" to={`/artikel?category=${category.value}`}>{category.label}</Link></li>)}
              </ul>}
            </li>)}
          </ul>
        </nav>
        <div>
          <h2 className="border-b-2 border-dotted border-white/60 pb-3 text-xl">{user ? user.name : 'Akun'}</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {user ? <>
              <li><Link onClick={onClose} className="hover:text-lime" to="/favorites">Resep favorit</Link></li>
              <li><Link onClick={onClose} className="hover:text-lime" to="/profile">Profil</Link></li>
              {user.role === 'ADMIN' && <>
                <li><Link onClick={onClose} className="hover:text-lime" to="/admin/recipes/new">Tambah resep</Link></li>
                <li><Link onClick={onClose} className="hover:text-lime" to="/admin/artikel/baru">Tulis artikel</Link></li>
              </>}
              <li><button type="button" disabled={logoutBusy} onClick={() => void logout()} className="hover:text-lime">{logoutBusy ? 'Keluar…' : 'Keluar'}</button></li>
            </> : <>
              <li><Link onClick={onClose} className="hover:text-lime" to="/login">Masuk</Link></li>
              <li><Link onClick={onClose} className="hover:text-lime" to="/register">Buat akun</Link></li>
            </>}
          </ul>
        </div>
      </div>
    </div>
  </div>;
}

export function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useEffect(() => { setMenuOpen(false); }, [location.key]);
  // Latar pembungkus hijau tua: header transparan tetap terbaca di halaman tanpa hero,
  // sedangkan hero bergambar memakai HEADER_OFFSET agar fotonya berada di belakang menu.
  return <div className="flex min-h-screen flex-col bg-forest">
    <header className="relative z-30 text-white">
      <div className="page flex h-[5.5rem] items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <Link to="/" className="border border-white/70 px-3 py-1 font-serif text-2xl leading-tight">DapurKita</Link>
          <button type="button" aria-haspopup="dialog" aria-expanded={menuOpen} aria-label="Buka menu" onClick={() => setMenuOpen(true)} className="flex h-11 w-11 items-center justify-center hover:text-lime">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-5 text-sm">
          {user
            ? <Link to="/favorites" className="hidden hover:text-lime sm:inline">Favorit</Link>
            : <Link to="/login" className="hidden hover:text-lime sm:inline">Masuk</Link>}
          <Link to="/recipes" className="btn-light btn-sm">Cari resep</Link>
        </div>
      </div>
    </header>
    {menuOpen && <FullscreenMenu onClose={closeMenu} />}
    <div className="flex-1 bg-white"><Outlet /></div>
    <footer className="bg-forest text-white">
      <div className="page grid gap-12 py-16 sm:grid-cols-[1fr_1fr_2fr]">
        <p className="font-serif text-5xl leading-tight">Dapur<br />Kita.</p>
        <div>
          <h2 className="text-lg">Jelajahi</h2>
          <ul className="mt-6 space-y-2 text-sm text-white/80">
            <li><Link className="hover:text-lime" to="/menu">Menu</Link></li>
            <li><Link className="hover:text-lime" to="/recipes">Semua resep</Link></li>
            <li><Link className="hover:text-lime" to="/artikel">Artikel</Link></li>
            <li><Link className="hover:text-lime" to="/tentang">Tentang</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg">Jangan lewatkan resep baru</h2>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <p className="flex-1 border border-white/80 px-4 py-3 text-sm text-white/80">{user ? `Halo, ${user.name}! Resep favoritmu tersimpan rapi.` : 'Buat akun untuk menyimpan resep favorit dan memberi ulasan.'}</p>
            <Link to={user ? '/favorites' : '/register'} className="btn shrink-0 border-olive bg-olive text-white hover:border-white hover:bg-white hover:text-forest">{user ? 'Lihat favorit' : 'Buat akun'}</Link>
          </div>
          <p className="mt-3 text-xs text-white/60">Gratis, tanpa iklan. Cukup nama, email, dan kata sandi.</p>
        </div>
      </div>
      <div className="border-t border-dotted border-white/50">
        <div className="page flex flex-wrap items-center justify-between gap-4 py-6 text-sm text-white/80">
          <p>© {new Date().getFullYear()} DapurKita. Semua hak dilindungi.</p>
          {!user && <p className="flex gap-5"><Link className="hover:text-lime" to="/login">Masuk</Link><Link className="hover:text-lime" to="/register">Daftar</Link></p>}
        </div>
      </div>
    </footer>
  </div>;
}
