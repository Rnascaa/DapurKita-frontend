import { z } from 'zod';

export type RecipeDraft = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  cookingTimeMinutes: number;
  servings: number;
  categoryId: number;
  ingredients: { name: string; quantity: string; unit: string | null }[];
  instructions: { description: string }[];
};

function isParsableUrl(value: string) {
  try { new URL(value); return true; } catch { return false; }
}

/** Path hasil POST /images (v2.4.0). */
export const UPLOADED_IMAGE_PATH = /^\/api\/v1\/images\/[a-f0-9]{32}\.(jpg|png|webp)$/;

/** URL http/https atau foto hasil upload; dipakai resep dan artikel. */
export const imageUrlSchema = z.string()
  .max(2048, 'URL gambar maksimal 2048 karakter.')
  .refine((value) => UPLOADED_IMAGE_PATH.test(value) || (/^https?:\/\//i.test(value) && isParsableUrl(value)),
    'URL gambar harus diawali http:// atau https://, atau berasal dari unggahan.')
  .nullable();
const imageUrl = imageUrlSchema;

const positiveInteger = (label: string, unit: string) => z.number({
  required_error: `${label} wajib diisi.`,
  invalid_type_error: `${label} wajib berupa angka.`,
}).int(`${label} harus bilangan bulat.`).min(1, `${label} minimal 1 ${unit}.`);

export const recipeSchema = z.object({
  title: z.string()
    .min(3, 'Judul minimal 3 karakter.')
    .max(150, 'Judul maksimal 150 karakter.'),
  description: z.string().max(2000, 'Deskripsi maksimal 2000 karakter.').nullable(),
  imageUrl,
  cookingTimeMinutes: positiveInteger('Waktu memasak', 'menit'),
  servings: positiveInteger('Porsi', 'porsi'),
  categoryId: z.number({ invalid_type_error: 'Pilih kategori.' }).int('Pilih kategori.').positive('Pilih kategori.'),
  ingredients: z.array(z.object({
    name: z.string().min(1, 'Nama bahan wajib diisi.').max(100, 'Nama bahan maksimal 100 karakter.'),
    quantity: z.string().min(1, 'Jumlah bahan wajib diisi.').max(50, 'Jumlah bahan maksimal 50 karakter.'),
    unit: z.string().max(30, 'Satuan maksimal 30 karakter.').nullable(),
  })).min(1, 'Minimal 1 bahan.').max(50, 'Maksimal 50 bahan.'),
  instructions: z.array(z.object({
    description: z.string().min(1, 'Langkah wajib diisi.').max(2000, 'Langkah maksimal 2000 karakter.'),
  })).min(1, 'Minimal 1 langkah.').max(50, 'Maksimal 50 langkah.'),
});

function blankToNull(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Field opsional yang kosong dikirim eksplisit sebagai null, sesuai konvensi kontrak. */
export function normalizeRecipeDraft(draft: RecipeDraft): RecipeDraft {
  return {
    ...draft,
    title: draft.title.trim(),
    description: blankToNull(draft.description),
    imageUrl: blankToNull(draft.imageUrl),
    ingredients: draft.ingredients.map(({ name, quantity, unit }) => ({
      name: name.trim(),
      quantity: quantity.trim(),
      unit: blankToNull(unit),
    })),
    instructions: draft.instructions.map(({ description }) => ({ description: description.trim() })),
  };
}

/** Id dari URL tidak tepercaya: hanya bilangan bulat positif yang boleh sampai ke API. */
export function parseRecipeId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
