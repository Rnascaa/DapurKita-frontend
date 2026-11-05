import type { components } from '../api/generated/openapi';

export type Category = components['schemas']['Category'];
export type RecipeDetail = components['schemas']['RecipeDetail'];

export const categories: Category[] = [
  { id: 1, name: 'Makanan Utama', slug: 'makanan-utama' },
  { id: 2, name: 'Lauk', slug: 'lauk' },
  { id: 3, name: 'Sayur', slug: 'sayur' },
  { id: 4, name: 'Sup dan Soto', slug: 'sup-dan-soto' },
  { id: 5, name: 'Sambal', slug: 'sambal' },
  { id: 6, name: 'Kue Tradisional', slug: 'kue-tradisional' },
  { id: 7, name: 'Jajanan', slug: 'jajanan' },
  { id: 8, name: 'Minuman', slug: 'minuman' },
];

export const recipes: RecipeDetail[] = [
  {
    id: 1, title: 'Rendang Sapi', description: 'Rendang gurih dengan bumbu rempah khas Minang.',
    imageUrl: null, cookingTimeMinutes: 180, servings: 6, category: { id: 2, name: 'Lauk' },
    isFavorited: false, createdAt: '2026-11-03T08:00:00Z', updatedAt: '2026-11-03T08:00:00Z',
    ingredients: [
      { name: 'Daging sapi', quantity: '1', unit: 'kg' },
      { name: 'Santan kental', quantity: '1', unit: 'liter' },
      { name: 'Garam', quantity: 'secukupnya', unit: null },
    ],
    instructions: [
      { stepNumber: 1, description: 'Haluskan bumbu.' },
      { stepNumber: 2, description: 'Masak daging dengan santan dan bumbu hingga empuk.' },
    ],
  },
  {
    id: 2, title: 'Soto Ayam', description: 'Soto bening hangat dengan suwiran ayam.',
    imageUrl: null, cookingTimeMinutes: 60, servings: 4, category: { id: 4, name: 'Sup dan Soto' },
    isFavorited: false, createdAt: '2026-11-02T08:00:00Z', updatedAt: '2026-11-02T08:00:00Z',
    ingredients: [
      { name: 'Ayam', quantity: '500', unit: 'g' },
      { name: 'Serai', quantity: '2', unit: 'batang' },
    ],
    instructions: [{ stepNumber: 1, description: 'Rebus ayam, tumis bumbu, lalu masak hingga meresap.' }],
  },
  {
    id: 3, title: 'Sayur Asem', description: 'Sayur asem segar untuk menu keluarga.',
    imageUrl: null, cookingTimeMinutes: 45, servings: 5, category: { id: 3, name: 'Sayur' },
    isFavorited: false, createdAt: '2026-11-01T08:00:00Z', updatedAt: '2026-11-01T08:00:00Z',
    ingredients: [
      { name: 'Jagung', quantity: '1', unit: 'buah' },
      { name: 'Kacang panjang', quantity: '100', unit: 'g' },
    ],
    instructions: [{ stepNumber: 1, description: 'Rebus bumbu dan sayuran hingga matang.' }],
  },
];
