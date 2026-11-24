import { useState, type ReactNode } from 'react';
import { HEADER_OFFSET, photo } from '../lib/photos';

/** Pengganti foto: dipakai jika resep atau artikel belum punya gambar. */
export function DishPlaceholder({ className = '', large = false, dark = false }: { className?: string; large?: boolean; dark?: boolean }) {
  return <div className={`flex items-center justify-center ${dark ? 'bg-olive/40' : 'bg-sage'} ${className}`} aria-hidden="true">
    <svg viewBox="0 0 64 64" className={large ? 'h-28 w-28' : 'h-16 w-16'} fill="none" stroke={dark ? '#EBF0E4' : '#5E6600'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 30h44" />
      <path d="M13 30v10a12 12 0 0 0 12 12h14a12 12 0 0 0 12-12V30" />
      <path d="M6 33h7M51 33h7" />
      <path d="M26 24c0-3 3-3 3-6s-3-3-3-6M33 24c0-3 3-3 3-6s-3-3-3-6M40 24c0-3 3-3 3-6s-3-3-3-6" opacity=".6" />
    </svg>
  </div>;
}

/** Foto dengan cadangan placeholder bila kosong atau gagal dimuat. */
export function Photo({ src, className = '', large = false, dark = false, alt = '' }: { src: string | null | undefined; className?: string; large?: boolean; dark?: boolean; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <DishPlaceholder className={className} large={large} dark={dark} />;
  return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} onError={() => setFailed(true)} />;
}

/** Foto latar dekoratif. Disembunyikan bila gagal dimuat, misalnya saat foto dekorasi tidak tersedia. */
export function BackdropPhoto({ src, className = '' }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img src={src} alt="" className={`object-cover ${className}`} onError={() => setFailed(true)} />;
}

/** Header halaman (desain Header_*): foto penuh di belakang menu, judul di tengah. */
export function PageHeader({ eyebrow, title, children, image = photo('kubis') }: { eyebrow?: string; title: string; children?: ReactNode; image?: string | null }) {
  return <section className={`relative flex min-h-[22rem] items-center overflow-hidden bg-forest text-white sm:min-h-[30rem] ${HEADER_OFFSET}`}>
    {image && <BackdropPhoto key={image} src={image} className="absolute inset-0 h-full w-full" />}
    <div className="absolute inset-0 bg-forest/60" aria-hidden="true" />
    <div className="page relative w-full py-14 text-center sm:py-20">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">{eyebrow}</p>}
      <h1 className="mx-auto mt-3 max-w-3xl break-words text-4xl leading-tight sm:text-6xl">{title}</h1>
      {children && <div className="mx-auto mt-4 max-w-xl text-white/80">{children}</div>}
    </div>
  </section>;
}

export function SectionTitle({ title, description, children, center = false }: { title: string; description?: string; children?: ReactNode; center?: boolean }) {
  return <div className={center ? 'text-center' : 'flex flex-wrap items-end justify-between gap-4'}>
    <div>
      <h2 className="text-4xl sm:text-5xl">{title}</h2>
      {description && <p className={`mt-3 text-sm text-graphite ${center ? 'mx-auto max-w-lg' : ''}`}>{description}</p>}
    </div>
    {children}
  </div>;
}

export function Arrow({ left = false }: { left?: boolean }) {
  return <svg viewBox="0 0 24 12" className={`h-3 w-6 ${left ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M0 6h22M17 1l5 5-5 5" /></svg>;
}

export function Heart({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" strokeLinejoin="round" />
  </svg>;
}

function Star({ fill }: { fill: number }) {
  const id = `s${Math.round(fill * 100)}`;
  return <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
    <defs><linearGradient id={id}><stop offset={`${fill * 100}%`} stopColor="currentColor" /><stop offset={`${fill * 100}%`} stopColor="transparent" /></linearGradient></defs>
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill={`url(#${id})`} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>;
}

/** Tampilan rating baca-saja. */
export function Stars({ value, size = 'h-4 w-4', label }: { value: number; size?: string; label?: string }) {
  return <span className="inline-flex items-center gap-0.5 text-olive" role="img" aria-label={label ?? `Rating ${value.toFixed(1)} dari 5`}>
    {[1, 2, 3, 4, 5].map((star) => <span key={star} className={size}><Star fill={Math.max(0, Math.min(1, value - star + 1))} /></span>)}
  </span>;
}

/** Pilihan rating 1-5 yang bisa dipakai dengan keyboard (radio). */
export function StarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return <div role="radiogroup" aria-label="Rating" className="flex gap-1 text-olive" onMouseLeave={() => setHover(0)}>
    {[1, 2, 3, 4, 5].map((star) => <label key={star} className="h-8 w-8 cursor-pointer" onMouseEnter={() => setHover(star)}>
      <input type="radio" name="rating" value={star} checked={value === star} onChange={() => onChange(star)} className="peer sr-only" aria-label={`${star} bintang`} />
      <span className="block h-full w-full rounded-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-olive"><Star fill={star <= shown ? 1 : 0} /></span>
    </label>)}
  </div>;
}

/** Avatar inisial; DapurKita tidak menyimpan foto profil. */
export function Avatar({ name, size = 'h-12 w-12' }: { name: string; size?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
  return <span className={`flex shrink-0 items-center justify-center rounded-full bg-sage font-serif text-lg text-olive ${size}`} aria-hidden="true">{initials}</span>;
}

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export function formatDate(value: string, withTime = false) {
  return (withTime ? dateTimeFormat : dateFormat).format(new Date(value));
}

/** Ilustrasi garis daun, digambar sendiri sebagai pengganti vektor template. */
export function LeafArt({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true">
    <path d="M100 190C100 130 104 70 120 12" />
    <path d="M120 12c-30 10-44 34-40 62 26-6 40-30 40-62z" />
    <path d="M110 60c26 2 46 18 52 44-28 2-46-14-52-44z" />
    <path d="M104 100c-28 0-50 14-58 40 30 4 52-12 58-40z" />
    <path d="M102 140c22 4 38 18 42 40-24 0-40-14-42-40z" />
    <path d="M86 52c10 6 18 14 24 22M126 72c10 8 18 18 26 28M70 120c10-4 22-8 32-14M112 152c8 6 16 14 22 22" opacity=".6" />
  </svg>;
}

/** Ikon garis untuk bagian keunggulan. */
export function FeatureIcon({ name }: { name: 'pot' | 'leaf' | 'clock' }) {
  const paths = {
    pot: <><path d="M8 22h32" /><path d="M10 22v8a9 9 0 0 0 9 9h10a9 9 0 0 0 9-9v-8" /><path d="M20 16c0-2 2-2 2-4s-2-2-2-4M27 16c0-2 2-2 2-4s-2-2-2-4" /></>,
    leaf: <><path d="M10 38C10 20 22 10 38 10c0 16-10 28-28 28z" /><path d="M10 38L30 18" /></>,
    clock: <><circle cx="24" cy="24" r="14" /><path d="M24 16v8l6 4" /></>,
  };
  return <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
