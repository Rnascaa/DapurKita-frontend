import { Link } from 'react-router-dom';

export function RecipeNotFound({ message = 'Resep tidak ditemukan' }: { message?: string }) {
  return <main className="mx-auto max-w-4xl px-5 py-12">
    <h1 role="alert" className="text-2xl font-bold">{message}</h1>
    <Link className="mt-4 inline-block text-orange-800" to="/recipes">Kembali ke daftar resep</Link>
  </main>;
}
