import type { components } from '../api/generated/openapi';

export type Category = components['schemas']['Category'];
/** Data mentah resep di mock; rating dihitung dari ulasan saat dikirim. */
export type RecipeDetail = Omit<components['schemas']['RecipeDetail'], 'ratingAverage' | 'ratingCount'>;
export type ArticleRecord = Omit<components['schemas']['ArticleDetail'], 'previous' | 'next' | 'readingTimeMinutes'>;
export type CommentRecord = Omit<components['schemas']['Comment'], 'replies'>;
export type ReviewRecord = components['schemas']['Review'] & { recipeId: number };

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

/** Foto FoodZero untuk mode mock; URL absolut agar lolos validasi http/https saat resep diedit. */
const mockPhoto = (name: string) => `${window.location.origin}/images/foodzero/${name}.jpg`;

const category = (id: number) => {
  const found = categories.find((item) => item.id === id)!;
  return { id: found.id, name: found.name };
};
const day = (date: number) => `2026-11-${String(date).padStart(2, '0')}T08:00:00Z`;
const ing = (name: string, quantity: string, unit: string | null = null) => ({ name, quantity, unit });
const steps = (...items: string[]) => items.map((description, index) => ({ stepNumber: index + 1, description }));

export const recipes: RecipeDetail[] = [
  {
    id: 1, title: 'Rendang Sapi', description: 'Rendang gurih dengan bumbu rempah khas Minang.',
    imageUrl: mockPhoto('steak-wajan'), cookingTimeMinutes: 180, servings: 6, category: category(2),
    isFavorited: false, createdAt: day(10), updatedAt: day(10),
    ingredients: [ing('Daging sapi', '1', 'kg'), ing('Santan kental', '1', 'liter'), ing('Cabai merah', '10', 'buah'), ing('Garam', 'secukupnya')],
    instructions: steps('Haluskan bumbu.', 'Masak daging dengan santan dan bumbu hingga empuk.', 'Aduk terus dengan api kecil sampai bumbu mengering dan berwarna cokelat gelap.'),
  },
  {
    id: 2, title: 'Soto Ayam', description: 'Soto bening hangat dengan suwiran ayam.',
    imageUrl: mockPhoto('sup-labu'), cookingTimeMinutes: 60, servings: 4, category: category(4),
    isFavorited: false, createdAt: day(9), updatedAt: day(9),
    ingredients: [ing('Ayam', '500', 'g'), ing('Serai', '2', 'batang'), ing('Kunyit', '2', 'ruas')],
    instructions: steps('Rebus ayam hingga matang, lalu suwir.', 'Tumis bumbu halus dan masukkan ke kaldu.', 'Sajikan dengan suwiran ayam dan pelengkap.'),
  },
  {
    id: 3, title: 'Sayur Asem', description: 'Sayur asem segar untuk menu keluarga.',
    imageUrl: mockPhoto('kat-sayur'), cookingTimeMinutes: 45, servings: 5, category: category(3),
    isFavorited: false, createdAt: day(8), updatedAt: day(8),
    ingredients: [ing('Jagung', '1', 'buah'), ing('Kacang panjang', '100', 'g'), ing('Asam jawa', '2', 'sdm')],
    instructions: steps('Rebus bumbu dan asam jawa.', 'Masukkan sayuran dari yang paling keras hingga matang.'),
  },
  {
    id: 4, title: 'Nasi Goreng Kampung', description: 'Nasi goreng sederhana dengan terasi dan telur ceplok.',
    imageUrl: mockPhoto('ikan-sayur'), cookingTimeMinutes: 20, servings: 2, category: category(1),
    isFavorited: false, createdAt: day(7), updatedAt: day(7),
    ingredients: [ing('Nasi putih', '2', 'piring'), ing('Bawang merah', '5', 'siung'), ing('Terasi', '1', 'sdt'), ing('Telur ayam', '2', 'butir')],
    instructions: steps('Haluskan bawang dan terasi, lalu tumis hingga harum.', 'Masukkan nasi dan aduk rata dengan api besar.', 'Sajikan dengan telur ceplok.'),
  },
  {
    id: 5, title: 'Sambal Matah', description: 'Sambal mentah khas Bali yang segar dan harum serai.',
    imageUrl: mockPhoto('kat-sambal'), cookingTimeMinutes: 15, servings: 4, category: category(5),
    isFavorited: false, createdAt: day(6), updatedAt: day(6),
    ingredients: [ing('Bawang merah', '10', 'siung'), ing('Cabai rawit', '15', 'buah'), ing('Serai', '2', 'batang'), ing('Minyak kelapa', '3', 'sdm')],
    instructions: steps('Iris tipis semua bahan.', 'Siram dengan minyak kelapa panas dan aduk rata.'),
  },
  {
    id: 6, title: 'Klepon', description: 'Bola ketan pandan berisi gula merah cair, berbalut kelapa parut.',
    imageUrl: mockPhoto('kat-kue'), cookingTimeMinutes: 40, servings: 6, category: category(6),
    isFavorited: false, createdAt: day(5), updatedAt: day(5),
    ingredients: [ing('Tepung ketan', '250', 'g'), ing('Air daun pandan', '200', 'ml'), ing('Gula merah', '100', 'g'), ing('Kelapa parut', '150', 'g')],
    instructions: steps('Uleni tepung ketan dengan air pandan.', 'Isi dengan gula merah dan bentuk bulat.', 'Rebus hingga mengapung, lalu gulingkan di kelapa parut.'),
  },
  {
    id: 7, title: 'Pisang Goreng Kipas', description: 'Pisang goreng renyah untuk teman minum teh sore.',
    imageUrl: mockPhoto('kat-jajanan'), cookingTimeMinutes: 25, servings: 4, category: category(7),
    isFavorited: false, createdAt: day(4), updatedAt: day(4),
    ingredients: [ing('Pisang kepok', '6', 'buah'), ing('Tepung terigu', '150', 'g'), ing('Tepung beras', '50', 'g')],
    instructions: steps('Belah pisang berbentuk kipas.', 'Celupkan ke adonan tepung.', 'Goreng hingga kuning keemasan.'),
  },
  {
    id: 8, title: 'Es Cendol', description: 'Cendol hijau dengan santan dan gula aren yang menyegarkan.',
    imageUrl: mockPhoto('kat-minuman'), cookingTimeMinutes: 30, servings: 4, category: category(8),
    isFavorited: false, createdAt: day(3), updatedAt: day(3),
    ingredients: [ing('Tepung hunkwe', '100', 'g'), ing('Santan', '500', 'ml'), ing('Gula aren', '150', 'g')],
    instructions: steps('Masak tepung hunkwe dengan air pandan hingga mengental.', 'Cetak cendol ke dalam air es.', 'Sajikan dengan santan dan gula aren cair.'),
  },
  {
    id: 9, title: 'Ayam Bakar Taliwang', description: 'Ayam bakar pedas khas Lombok dengan bumbu cabai dan terasi.',
    imageUrl: mockPhoto('salmon'), cookingTimeMinutes: 70, servings: 4, category: category(1),
    isFavorited: false, createdAt: day(2), updatedAt: day(2),
    ingredients: [ing('Ayam kampung', '1', 'ekor'), ing('Cabai merah kering', '10', 'buah'), ing('Terasi', '1', 'sdt')],
    instructions: steps('Lumuri ayam dengan bumbu halus.', 'Ungkep hingga bumbu meresap.', 'Bakar sambil dioles sisa bumbu.'),
  },
  {
    id: 10, title: 'Gado-gado', description: 'Sayuran rebus dengan saus kacang yang kental dan gurih.',
    imageUrl: mockPhoto('salad-tomat'), cookingTimeMinutes: 35, servings: 4, category: category(1),
    isFavorited: false, createdAt: day(1), updatedAt: day(1),
    ingredients: [ing('Kacang tanah goreng', '200', 'g'), ing('Kol', '200', 'g'), ing('Tauge', '100', 'g'), ing('Tahu', '2', 'potong')],
    instructions: steps('Rebus sayuran sebentar.', 'Ulek kacang dengan bumbu dan air hangat.', 'Siram sayuran dengan saus kacang.'),
  },
];

const tim = { id: 1, name: 'Tim DapurKita' };

export const articles: ArticleRecord[] = [
  {
    id: 1, title: 'Rahasia Santan Tidak Pecah Saat Dimasak', excerpt: 'Tiga kebiasaan kecil yang membuat kuah santan tetap halus dan mengilap.',
    coverImageUrl: mockPhoto('artikel-pir'), category: 'TIPS', tags: ['santan', 'rendang', 'kuah'], author: tim,
    publishedAt: '2026-11-20T03:00:00Z', updatedAt: '2026-11-20T03:00:00Z',
    content: 'Santan yang pecah membuat kuah terlihat berminyak dan bergerindil. Penyebab utamanya adalah panas yang terlalu tinggi dan santan yang dibiarkan tanpa diaduk.\n\nMasukkan santan saat api sudah dikecilkan, lalu aduk perlahan dengan gerakan memutar sampai kuah mendidih. Setelah mendidih, santan lebih stabil dan boleh ditinggal sebentar.\n\nGaram sebaiknya dimasukkan di akhir. Garam yang masuk terlalu awal dapat menarik air dari santan sehingga lemaknya lebih mudah terpisah.',
  },
  {
    id: 2, title: 'Mengenal Rempah Dasar Dapur Nusantara', excerpt: 'Kunyit, lengkuas, jahe, dan kencur: kapan dipakai dan bagaimana menyimpannya.',
    coverImageUrl: mockPhoto('artikel-piring'), category: 'BAHAN', tags: ['rempah', 'bumbu dasar'], author: tim,
    publishedAt: '2026-11-17T03:00:00Z', updatedAt: '2026-11-17T03:00:00Z',
    content: 'Hampir semua masakan Indonesia berangkat dari empat rimpang: kunyit, lengkuas, jahe, dan kencur. Masing-masing memberi karakter yang berbeda.\n\nKunyit memberi warna kuning dan aroma tanah, cocok untuk soto dan opor. Lengkuas memberi aroma segar dan biasanya cukup digeprek. Jahe menghangatkan dan menghilangkan amis, sedangkan kencur memberi rasa khas pada pecel dan urap.\n\nSimpan rimpang di tempat kering dan sejuk, jangan dalam kantong plastik tertutup. Rimpang yang sudah dihaluskan bisa dibekukan dalam cetakan es batu untuk dipakai sewaktu-waktu.',
  },
  {
    id: 3, title: 'Teknik Mengungkep agar Bumbu Meresap', excerpt: 'Mengungkep adalah kunci ayam goreng dan ayam bakar yang gurih sampai ke tulang.',
    coverImageUrl: mockPhoto('daging-segar'), category: 'TEKNIK', tags: ['ayam', 'ungkep', 'bakar'], author: tim,
    publishedAt: '2026-11-13T03:00:00Z', updatedAt: '2026-11-13T03:00:00Z',
    content: 'Mengungkep berarti memasak bahan bersama bumbu dan sedikit air dengan api kecil sampai airnya hampir habis. Teknik ini membuat bumbu masuk ke serat daging.\n\nGunakan panci bertutup dan api kecil. Balik potongan ayam setiap sepuluh menit agar matang merata.\n\nSetelah diungkep, ayam bisa langsung digoreng atau dibakar. Sisa bumbu ungkep jangan dibuang, karena sangat enak untuk olesan saat membakar.',
  },
  {
    id: 4, title: 'Cerita di Balik Sepiring Gado-gado', excerpt: 'Hidangan sayur sederhana yang menyatukan banyak rasa dalam satu saus kacang.',
    coverImageUrl: null, category: 'CERITA', tags: ['gado-gado', 'saus kacang'], author: tim,
    publishedAt: '2026-11-09T03:00:00Z', updatedAt: '2026-11-09T03:00:00Z',
    content: 'Gado-gado berarti campur aduk. Namanya menggambarkan isinya: sayuran rebus, tahu, tempe, telur, dan kerupuk yang disatukan oleh saus kacang.\n\nSetiap daerah punya versinya sendiri. Ada yang memakai petis, ada yang menambahkan kencur, dan ada pula yang membuat sausnya lebih encer.\n\nYang membuat gado-gado istimewa adalah keseimbangannya: gurih kacang, manis gula merah, asam jeruk limau, dan pedas cabai dalam satu suapan.',
  },
  {
    id: 5, title: 'Cara Menyimpan Sambal agar Tahan Lama', excerpt: 'Sambal buatan sendiri bisa awet berminggu-minggu dengan cara yang tepat.',
    coverImageUrl: null, category: 'TIPS', tags: ['sambal', 'penyimpanan'], author: tim,
    publishedAt: '2026-11-05T03:00:00Z', updatedAt: '2026-11-05T03:00:00Z',
    content: 'Sambal yang dimasak hingga minyaknya keluar jauh lebih awet daripada sambal mentah. Air di dalam sambal adalah penyebab utama sambal cepat basi.\n\nGunakan wadah kaca yang sudah disterilkan dengan air panas dan pastikan benar-benar kering. Selalu ambil sambal dengan sendok bersih.\n\nSimpan di lemari es dan tambahkan lapisan tipis minyak di permukaan. Dengan cara ini, sambal masak bisa bertahan dua sampai tiga minggu.',
  },
];

const user = (id: number, name: string) => ({ id, name });

export const comments: CommentRecord[] = [
  { id: 1, recipeId: 1, parentId: null, author: user(101, 'Rina'), content: 'Sudah saya coba untuk acara keluarga, semua suka! Saya tambahkan daun jeruk sedikit.', createdAt: '2026-11-18T10:00:00Z' },
  { id: 2, recipeId: 1, parentId: 1, author: user(1, 'Admin DapurKita'), content: 'Terima kasih sudah mencoba, Rina. Daun jeruk memang menambah aroma segar.', createdAt: '2026-11-18T12:00:00Z' },
  { id: 3, recipeId: 1, parentId: null, author: user(102, 'Bayu'), content: 'Berapa lama kira-kira sampai bumbunya benar-benar kering?', createdAt: '2026-11-19T09:00:00Z' },
  { id: 4, recipeId: 2, parentId: null, author: user(103, 'Sari'), content: 'Kuahnya bening dan segar, cocok untuk sarapan.', createdAt: '2026-11-15T07:00:00Z' },
];

export const reviews: ReviewRecord[] = [
  { id: 1, recipeId: 1, rating: 5, content: 'Bumbunya meresap sempurna, persis rendang di kampung halaman.', author: user(101, 'Rina'), createdAt: '2026-11-18T10:05:00Z', updatedAt: '2026-11-18T10:05:00Z' },
  { id: 2, recipeId: 1, rating: 4, content: 'Enak, tapi butuh kesabaran. Hasilnya sepadan.', author: user(102, 'Bayu'), createdAt: '2026-11-19T09:05:00Z', updatedAt: '2026-11-19T09:05:00Z' },
  { id: 3, recipeId: 2, rating: 5, content: 'Resep soto paling mudah yang pernah saya coba.', author: user(103, 'Sari'), createdAt: '2026-11-15T07:05:00Z', updatedAt: '2026-11-15T07:05:00Z' },
  { id: 4, recipeId: 6, rating: 5, content: 'Klepon pertama saya langsung berhasil, gula merahnya lumer.', author: user(104, 'Dewi'), createdAt: '2026-11-12T15:00:00Z', updatedAt: '2026-11-12T15:00:00Z' },
  { id: 5, recipeId: 4, rating: 3, content: null, author: user(105, 'Andi'), createdAt: '2026-11-11T13:00:00Z', updatedAt: '2026-11-11T13:00:00Z' },
];
