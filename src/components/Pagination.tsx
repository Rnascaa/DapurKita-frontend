/** Paginasi bernomor bergaya FoodZero; halaman jauh diringkas dengan elipsis. */
export function Pagination({ page, totalPages, onPage, label = 'Navigasi halaman' }: { page: number; totalPages: number; onPage: (page: number) => void; label?: string }) {
  if (totalPages <= 1) return null;
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((item) => item >= 1 && item <= totalPages).sort((a, b) => a - b);
  const box = 'flex h-9 min-w-9 items-center justify-center border px-3 text-sm transition-colors';
  return <nav aria-label={label} className="mt-14 flex flex-wrap items-center justify-center gap-2">
    <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={`${box} border-black hover:bg-sage disabled:cursor-not-allowed disabled:opacity-40`}>Sebelumnya</button>
    {pages.map((item, index) => <span key={item} className="flex items-center gap-2">
      {index > 0 && item - pages[index - 1] > 1 && <span className="text-graphite" aria-hidden="true">…</span>}
      <button type="button" aria-current={item === page ? 'page' : undefined} aria-label={`Halaman ${item}`} onClick={() => onPage(item)}
        className={`${box} ${item === page ? 'border-forest bg-forest text-white' : 'border-black hover:bg-sage'}`}>{item}</button>
    </span>)}
    <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className={`${box} border-black hover:bg-sage disabled:cursor-not-allowed disabled:opacity-40`}>Berikutnya</button>
  </nav>;
}
