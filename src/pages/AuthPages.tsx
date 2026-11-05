import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi, setSession } from '../api';
import type { components } from '../api/generated/openapi';
import { loginSchema, registerSchema } from '../features/auth/validation';
import { safeInternalPath } from '../features/auth/redirect';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

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
    <main className="mx-auto max-w-md px-5 py-12">
      <h1 className="text-3xl font-bold">{isRegister ? 'Buat akun' : 'Masuk ke DapurKita'}</h1>
      <p className="mt-2 text-stone-600">{isRegister ? 'Daftar untuk menyimpan resep favorit.' : 'Masuk untuk melihat koleksi favoritmu.'}</p>
      <form className="mt-8 space-y-4" onSubmit={submit} noValidate>
        {isRegister && <label className="block">Nama<input required autoComplete="name" className="mt-1 w-full rounded-lg border-stone-300" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />{fieldErrors.name && <span className="text-sm text-red-700">{fieldErrors.name}</span>}</label>}
        <label className="block">Email<input required type="email" autoComplete="email" className="mt-1 w-full rounded-lg border-stone-300" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />{fieldErrors.email && <span className="text-sm text-red-700">{fieldErrors.email}</span>}</label>
        <label className="block">Kata sandi<input required type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} className="mt-1 w-full rounded-lg border-stone-300" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />{fieldErrors.password && <span className="text-sm text-red-700">{fieldErrors.password}</span>}</label>
        {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-orange-700 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Memproses…' : isRegister ? 'Daftar' : 'Masuk'}</button>
      </form>
      <p className="mt-5 text-sm">{isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'} <Link className="font-semibold text-orange-800" to={isRegister ? '/login' : '/register'} state={location.state}>{isRegister ? 'Masuk' : 'Daftar'}</Link></p>
    </main>
  );
}

export function LoginPage() { return <AuthForm mode="login" />; }
export function RegisterPage() { return <AuthForm mode="register" />; }
