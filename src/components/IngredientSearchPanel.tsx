import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

/** Pengganti panel reservasi FoodZero: cari resep dari bahan yang tersedia (memakai pencarian v2.3). */
export function IngredientSearchPanel() {
  const navigate = useNavigate();
  const [values, setValues] = useState(['', '', '']);
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ingredients = values.map((value) => value.trim()).filter(Boolean);
    if (!ingredients.length) { setError('Isi minimal satu bahan.'); return; }
    const params = new URLSearchParams();
    ingredients.forEach((ingredient) => params.append('ingredient', ingredient));
    navigate(`/recipes?${params}`);
  }
  return <section className="bg-sage">
    <form onSubmit={submit} noValidate className="page py-16 text-center sm:py-24">
      <h2 className="text-4xl sm:text-6xl">Masak dari bahan yang ada</h2>
      <p className="mt-3 text-sm text-graphite">Tulis bahan di dapurmu, kami carikan resep yang memakai semuanya.</p>
      <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
        {values.map((value, index) => <label key={index} className="block text-left">
          <span className="sr-only">Bahan {index + 1}</span>
          <input className="field mt-0" placeholder={['mis. ayam', 'mis. santan', 'mis. cabai'][index]} value={value}
            onChange={(event) => { setError(''); setValues(values.map((item, i) => i === index ? event.target.value : item)); }} />
        </label>)}
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <button type="submit" className="btn-dark mt-10">Cari resep</button>
    </form>
  </section>;
}
