import { z } from 'zod';

export const commentSchema = z.object({
  content: z.string().trim().min(1, 'Komentar wajib diisi.').max(1000, 'Komentar maksimal 1000 karakter.'),
  parentId: z.number().int().positive().nullable(),
});

export const reviewSchema = z.object({
  rating: z.number({ invalid_type_error: 'Pilih rating 1 sampai 5.' }).int().min(1, 'Pilih rating 1 sampai 5.').max(5, 'Pilih rating 1 sampai 5.'),
  content: z.string().trim().max(500, 'Ulasan maksimal 500 karakter.').nullable()
    .transform((value) => value || null),
});

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Pemeriksaan cepat di browser; backend tetap memeriksa isi file. */
export function imageFileError(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) return 'Foto harus berformat JPEG, PNG, atau WebP.';
  if (file.size > MAX_IMAGE_BYTES) return 'Ukuran foto maksimal 5 MB.';
  return null;
}
