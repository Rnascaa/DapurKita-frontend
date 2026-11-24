import { z } from 'zod';
import type { components } from '../../api/generated/openapi';
import { imageUrlSchema } from '../recipes/validation';

export type ArticleCategory = components['schemas']['ArticleCategory'];

export const ARTICLE_CATEGORIES: { value: ArticleCategory; label: string }[] = [
  { value: 'TIPS', label: 'Tips dapur' },
  { value: 'CERITA', label: 'Cerita kuliner' },
  { value: 'BAHAN', label: 'Mengenal bahan' },
  { value: 'TEKNIK', label: 'Teknik memasak' },
];

export function articleCategoryLabel(value: ArticleCategory) {
  return ARTICLE_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}

export function isArticleCategory(value: string | null): value is ArticleCategory {
  return ARTICLE_CATEGORIES.some((item) => item.value === value);
}

export type ArticleDraft = {
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  category: ArticleCategory;
  tags: string[];
};

export const articleSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter.').max(150, 'Judul maksimal 150 karakter.'),
  excerpt: z.string().max(300, 'Ringkasan maksimal 300 karakter.').nullable(),
  content: z.string().min(1, 'Isi artikel wajib diisi.').max(20000, 'Isi artikel maksimal 20.000 karakter.'),
  coverImageUrl: imageUrlSchema,
  category: z.enum(['TIPS', 'CERITA', 'BAHAN', 'TEKNIK'], { errorMap: () => ({ message: 'Pilih kategori.' }) }),
  tags: z.array(z.string().min(1, 'Tag tidak boleh kosong.').max(30, 'Tag maksimal 30 karakter.')).max(8, 'Maksimal 8 tag.'),
});

/** Field kosong dikirim sebagai null; tag di-trim, huruf kecil, tanpa duplikat (sesuai kontrak). */
export function normalizeArticleDraft(draft: ArticleDraft): ArticleDraft {
  const blank = (value: string | null) => value?.trim() || null;
  return {
    ...draft,
    title: draft.title.trim(),
    excerpt: blank(draft.excerpt),
    content: draft.content.trim(),
    coverImageUrl: blank(draft.coverImageUrl),
    tags: [...new Set(draft.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))],
  };
}

/** Paragraf dipisahkan baris kosong (kontrak: teks biasa, tanpa HTML/Markdown). */
export function paragraphs(content: string) {
  return content.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}
