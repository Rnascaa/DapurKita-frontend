/**
 * Foto dekoratif di public/images/foodzero. Foto ini tidak ikut repo (lisensi template) dan ditambahkan
 * saat build produksi. Tanpa foto, halaman tetap tampil dengan latar polos atau ikon panci.
 * Foto resep dan artikel tetap dari unggahan admin.
 */
export const photo = (name: string) => `/images/foodzero/${name}.jpg`;

const categoryPhotos: Record<string, string> = {
  'makanan-utama': 'kat-makanan-utama',
  lauk: 'kat-lauk',
  sayur: 'kat-sayur',
  'sup-dan-soto': 'kat-sup',
  sambal: 'kat-sambal',
  'kue-tradisional': 'kat-kue',
  jajanan: 'kat-jajanan',
  minuman: 'kat-minuman',
};

/** Foto kategori; kategori baru yang belum dipetakan memakai foto umum. */
export function categoryPhoto(slug: string) {
  return photo(categoryPhotos[slug] ?? 'meja-kayu');
}

/** Tinggi header situs; hero memakai -mt dengan nilai ini agar foto berada di belakang menu (desain FoodZero). */
export const HEADER_OFFSET = '-mt-[5.5rem] pt-[5.5rem]';
