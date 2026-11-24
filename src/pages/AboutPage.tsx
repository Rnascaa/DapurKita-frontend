import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Arrow, LeafArt, PageHeader, Photo } from '../components/Decor';
import { IngredientSearchPanel } from '../components/IngredientSearchPanel';
import { photo } from '../lib/photos';

const process = [
  { title: 'Siapkan', image: 'proses-potong', text: 'Kumpulkan bahan dan takar sesuai resep. Bahan yang disiapkan lebih dulu membuat proses memasak lebih tenang.' },
  { title: 'Bumbui', image: 'proses-garam', text: 'Haluskan, iris, atau lumuri bahan dengan bumbu. Di tahap inilah rasa khas masakan Indonesia terbentuk.' },
  { title: 'Masak', image: 'proses-bakar', text: 'Masak hingga matang, cicipi, lalu sajikan selagi hangat untuk orang-orang tersayang.' },
];

const audiences = [
  { title: 'Untuk yang baru belajar', image: 'ikan-piring', text: 'Setiap resep memakai langkah singkat dan takaran yang jelas, jadi aman dicoba walau baru pertama kali memasak.' },
  { title: 'Untuk dapur keluarga', image: 'steak-wajan', text: 'Simpan resep favorit, beri ulasan, dan tanyakan hal yang membingungkan lewat kolom komentar.' },
];

/** Halaman Tentang (desain "About"). Bagian staf diganti dengan untuk siapa DapurKita dibuat. */
export function AboutPage() {
  useDocumentTitle('Tentang');
  return <main>
    <PageHeader eyebrow="Tentang kami" title="Cerita DapurKita" image={photo('meja-lemon')}>Tempat berbagi resep masakan Indonesia yang bisa dibuat di dapur rumah.</PageHeader>

    <section className="page grid gap-12 py-20 sm:py-28 lg:grid-cols-2 lg:items-center">
      <div className="relative">
        <LeafArt className="pointer-events-none absolute -top-24 left-1/3 h-40 w-40 text-black/40" />
        <h2 className="relative text-5xl sm:text-6xl">Cerita kami</h2>
        <p className="relative mt-6 max-w-md text-graphite">DapurKita berawal dari kebiasaan sederhana: bertanya resep kepada ibu, nenek, dan tetangga. Resep-resep itu kami tulis ulang dengan bahasa yang ringkas agar siapa pun bisa mencobanya.</p>
      </div>
      <Photo src={photo('meja-kayu')} large className="aspect-[4/3] w-full" />
    </section>

    <section className="page grid gap-16 pb-20 sm:pb-28 lg:grid-cols-2">
      {audiences.map((item, index) => <div key={item.title} className={index === 1 ? 'lg:mt-48' : ''}>
        <h2 className="text-center text-4xl">{item.title}</h2>
        <Photo src={photo(item.image)} className="mt-6 aspect-[4/5] w-full" />
        <p className={`mt-6 max-w-sm text-sm text-graphite ${index === 0 ? 'lg:ml-auto lg:text-right' : ''}`}>{item.text}</p>
      </div>)}
    </section>

    <section className="relative overflow-hidden bg-forest text-white">
      <Photo src={photo('kanape')} dark large className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-forest/60" aria-hidden="true" />
      <div className="page relative py-28 text-center sm:py-40">
        <h2 className="text-5xl sm:text-7xl">Kelihatannya lezat</h2>
        <p className="mx-auto mt-4 max-w-md text-white/80">Lebih dari sekadar resep: setiap hidangan punya cerita yang layak dibagikan.</p>
        <Link to="/recipes" className="btn-light mt-10">Mulai memasak <Arrow /></Link>
      </div>
    </section>

    <section className="relative overflow-hidden">
      <LeafArt className="pointer-events-none absolute -right-8 top-6 h-60 w-60 text-olive/30" />
      <LeafArt className="pointer-events-none absolute -bottom-10 -left-10 hidden h-56 w-56 text-olive/30 lg:block" />
      <div className="page py-20 sm:py-28">
        <h2 className="text-center text-5xl sm:text-6xl">Proses yang sederhana</h2>
        <ol className="mt-16 space-y-20">
          {process.map((step, index) => <li key={step.title} className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <Photo src={photo(step.image)} className={`aspect-[4/3] w-full ${index % 2 ? 'lg:order-2' : ''}`} />
            <div>
              <h3 className="text-5xl"><span className="font-sans font-bold text-olive">0{index + 1}.</span>{step.title}</h3>
              <p className="mt-5 max-w-md text-sm text-graphite">{step.text}</p>
            </div>
          </li>)}
        </ol>
      </div>
    </section>

    <IngredientSearchPanel />
  </main>;
}
