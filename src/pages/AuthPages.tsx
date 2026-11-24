import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi, setSession } from '../api';
import type { components } from '../api/generated/openapi';
import { loginSchema, registerSchema } from '../features/auth/validation';
import { safeInternalPath } from '../features/auth/redirect';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { HEADER_OFFSET, photo } from '../lib/photos';
import { BackdropPhoto } from '../components/Decor';

type ErrorResponse = components['schemas']['ErrorResponse'];

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register';
  useDocumentTitle(isRegister ? 'Daftar akun' : 'Masuk');
  const location = useLocation();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError('');
    const parsed = (isRegister ? registerSchema : loginSchema).safeParse(values);
    if (!parsed.success) {
      setFieldErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setBusy(true);
    const result = isRegister
      ? await authApi.register(parsed.data as { name: string; email: string; password: string })
      : await authApi.login(parsed.data as { email: string; password: string });
    setBusy(false);
    if (result.error) {
      const error = result.error as ErrorResponse;
      if (error.code === 'INVALID_CREDENTIALS') setFormError('Email atau password tidak cocok.');
      else if (error.code === 'EMAIL_ALREADY_EXISTS') setFieldErrors({ email: error.message });
      else if (error.code === 'VALIDATION_ERROR') {
        setFieldErrors(Object.fromEntries((error.errors ?? []).map((item) => [item.field, item.message])));
      } else setFormError(error.code === 'TOO_MANY_REQUESTS' ? 'Terlalu banyak percobaan. Coba lagi nanti.' : error.message);
      return;
    }
    if (!result.data) return;
    // Register returns AuthResponse and establishes the session immediately.
    setSession(result.data);
    navigate(safeInternalPath((location.state as { from?: unknown } | null)?.from), { replace: true });
  }

  return (
    <main className={`relative overflow-hidden bg-forest ${HEADER_OFFSET}`}>
      <BackdropPhoto src={photo('daun-oranye')} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-forest/60" aria-hidden="true" />
      <div className="page relative py-14 sm:py-24">
      <div className="mx-auto max-w-lg bg-sage px-6 py-10 sm:px-12 sm:py-14">
        <h1 className="text-center text-4xl sm:text-5xl">{isRegister ? 'Buat akun' : 'Selamat datang'}</h1>
        <p className="mt-3 text-center text-sm text-graphite">{isRegister ? 'Daftar untuk menyimpan resep favorit.' : 'Masuk untuk melihat koleksi favoritmu.'}</p>
        <form className="mt-10 space-y-5" onSubmit={submit} noValidate>
          {isRegister && <label className="field-label">Nama<input required autoComplete="name" className="field" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />{fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}</label>}
          <label className="field-label">Email<input required type="email" autoComplete="email" className="field" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />{fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}</label>
          <label className="field-label">Kata sandi<input required type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} className="field" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />{fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}</label>
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
          <button disabled={busy} className="btn-dark w-full">{busy ? 'Memproses…' : isRegister ? 'Daftar' : 'Masuk'}</button>
        </form>
        <p className="mt-8 border-t border-dotted border-black/40 pt-6 text-center text-sm">{isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'} <Link className="font-bold text-olive underline-offset-4 hover:underline" to={isRegister ? '/login' : '/register'} state={location.state}>{isRegister ? 'Masuk' : 'Daftar'}</Link></p>
      </div>
      </div>
    </main>
  );
}

export function LoginPage() { return <AuthForm mode="login" />; }
export function RegisterPage() { return <AuthForm mode="register" />; }
