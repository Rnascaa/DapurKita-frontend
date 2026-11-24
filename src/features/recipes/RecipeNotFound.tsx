import { Link } from 'react-router-dom';

export function RecipeNotFound({ message = 'Resep tidak ditemukan' }: { message?: string }) {
  return <main className="page py-24 text-center">
    <h1 role="alert" className="break-words text-4xl sm:text-5xl">{message}</h1>
    <Link className="btn-outline mt-8" to="/recipes">Kembali ke daftar resep</Link>
  </main>;
}
