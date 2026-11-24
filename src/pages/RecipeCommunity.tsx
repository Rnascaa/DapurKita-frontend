import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { commentApi, reviewApi } from '../api';
import type { components } from '../api/generated/openapi';
import { useAuth } from '../features/auth/AuthProvider';
import { commentSchema, reviewSchema } from '../features/community/validation';
import { Avatar, formatDate, StarInput, Stars } from '../components/Decor';

type RecipeDetail = components['schemas']['RecipeDetail'];
type Review = components['schemas']['Review'];
type Comment = components['schemas']['Comment'];
type ErrorResponse = components['schemas']['ErrorResponse'];

const CONNECTION_ERROR = 'Tidak dapat terhubung ke server. Coba lagi.';

function LoginPrompt({ action }: { action: string }) {
  const location = useLocation();
  return <p className="text-sm text-graphite">
    <Link to="/login" state={{ from: `${location.pathname}${location.search}` }} className="font-bold text-olive underline-offset-4 hover:underline">Masuk</Link> untuk {action}.
  </p>;
}

function fieldMessage(error: ErrorResponse | undefined, field: string) {
  return error?.errors?.find((item) => item.field === field)?.message ?? error?.message ?? 'Gagal menyimpan.';
}

export function ReviewsSection({ recipe, onChanged }: { recipe: RecipeDetail; onChanged: () => void }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [mine, setMine] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (pageNumber: number) => {
    setLoadError('');
    try {
      const result = await reviewApi.list(recipe.id, { page: pageNumber, size: 5 });
      if (!result.data) { setLoadError(result.error?.message ?? 'Ulasan gagal dimuat.'); return; }
      const data = result.data;
      setReviews((current) => pageNumber === 1 ? data.content : [...current, ...data.content]);
      setPage(pageNumber); setHasNext(data.hasNext);
    } catch { setLoadError(CONNECTION_ERROR); }
  }, [recipe.id]);

  useEffect(() => { void load(1); }, [load]);
  useEffect(() => {
    setMine(null); setRating(0); setContent('');
    if (!user) return;
    let active = true;
    reviewApi.mine(recipe.id).then((result) => {
      if (active && result.data) { setMine(result.data); setRating(result.data.rating); setContent(result.data.content ?? ''); }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [recipe.id, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(''); setSaved('');
    const parsed = reviewSchema.safeParse({ rating, content });
    if (!parsed.success) { setFormError(parsed.error.issues[0]?.message ?? 'Ulasan tidak valid.'); return; }
    setBusy(true);
    try {
      const result = await reviewApi.save(recipe.id, parsed.data);
      if (!result.data) { setFormError(fieldMessage(result.error as ErrorResponse | undefined, 'rating')); return; }
      setMine(result.data); setSaved(mine ? 'Ulasan diperbarui.' : 'Terima kasih, ulasanmu tersimpan.');
      await load(1); onChanged();
    } catch { setFormError(CONNECTION_ERROR); } finally { setBusy(false); }
  }
  async function removeMine() {
    if (!window.confirm('Hapus ulasanmu untuk resep ini?')) return;
    setBusy(true); setFormError(''); setSaved('');
    try {
      const result = await reviewApi.removeMine(recipe.id);
      if (result.error) { setFormError(result.error.message); return; }
      setMine(null); setRating(0); setContent('');
      await load(1); onChanged();
    } catch { setFormError(CONNECTION_ERROR); } finally { setBusy(false); }
  }
  async function removeAny(review: Review) {
    if (!window.confirm(`Hapus ulasan dari ${review.author.name}?`)) return;
    const result = await reviewApi.removeAny(review.id).catch(() => null);
    if (!result || result.error) { setLoadError(result?.error?.message ?? CONNECTION_ERROR); return; }
    if (mine?.id === review.id) { setMine(null); setRating(0); setContent(''); }
    await load(1); onChanged();
  }

  return <section aria-labelledby="judul-ulasan" className="bg-sage">
    <div className="page grid gap-12 py-16 sm:py-20 lg:grid-cols-[18rem_1fr]">
      <div>
        <h2 id="judul-ulasan" className="text-4xl sm:text-5xl">Ulasan</h2>
        {recipe.ratingAverage !== null && recipe.ratingCount > 0
          ? <div className="mt-6"><p className="font-sans text-6xl font-bold text-olive">{recipe.ratingAverage.toFixed(1)}</p><Stars value={recipe.ratingAverage} size="h-6 w-6" /><p className="mt-2 text-sm text-graphite">dari {recipe.ratingCount} ulasan</p></div>
          : <p className="mt-6 text-sm text-graphite">Belum ada ulasan. Jadilah yang pertama mencoba!</p>}
        <div className="mt-10 border-t border-dotted border-black/40 pt-6">
          <h3 className="text-xl">{mine ? 'Ulasanmu' : 'Beri ulasan'}</h3>
          {user ? <form onSubmit={submit} noValidate className="mt-4 space-y-4">
            <StarInput value={rating} onChange={(value) => { setRating(value); setFormError(''); }} />
            <label className="field-label">Ulasan (opsional)<textarea rows={3} maxLength={500} className="field" value={content} onChange={(event) => setContent(event.target.value)} /></label>
            {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
            {saved && <p role="status" className="text-sm font-bold text-olive">{saved}</p>}
            <div className="flex flex-wrap gap-3">
              <button disabled={busy} className="btn-dark btn-sm">{busy ? 'Menyimpan…' : mine ? 'Perbarui ulasan' : 'Kirim ulasan'}</button>
              {mine && <button type="button" disabled={busy} onClick={() => void removeMine()} className="btn-danger btn-sm">Hapus</button>}
            </div>
          </form> : <div className="mt-4"><LoginPrompt action="memberi ulasan" /></div>}
        </div>
      </div>
      <div>
        {loadError && <p role="alert" className="text-sm text-red-700">{loadError}</p>}
        <ul className="space-y-10">
          {reviews.map((review) => <li key={review.id}>
            {review.content && <p className="font-serif text-xl leading-relaxed sm:text-2xl">“{review.content}”</p>}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Avatar name={review.author.name} />
              <div className="min-w-0">
                <p className="font-serif text-lg">{review.author.name}</p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-graphite"><Stars value={review.rating} size="h-3.5 w-3.5" label={`${review.rating} dari 5 bintang`} />{formatDate(review.updatedAt)}</p>
              </div>
              {user?.role === 'ADMIN' && <button type="button" onClick={() => void removeAny(review)} className="ml-auto text-xs font-bold text-red-700 hover:underline">Hapus ulasan</button>}
            </div>
          </li>)}
        </ul>
        {hasNext && <button type="button" onClick={() => void load(page + 1)} className="btn-outline btn-sm mt-10">Muat ulasan lainnya</button>}
      </div>
    </div>
  </section>;
}

function CommentForm({ recipeId, parentId, onPosted, onCancel, compact = false }: { recipeId: number; parentId: number | null; onPosted: () => void; onCancel?: () => void; compact?: boolean }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const parsed = commentSchema.safeParse({ content, parentId });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Komentar tidak valid.'); return; }
    setBusy(true);
    try {
      const result = await commentApi.create(recipeId, parsed.data);
      if (!result.data) { setError(fieldMessage(result.error as ErrorResponse | undefined, 'content')); return; }
      setContent(''); onPosted();
    } catch { setError(CONNECTION_ERROR); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} noValidate className="space-y-4">
    <label className="field-label">{parentId ? 'Balasan' : 'Komentar'}
      <textarea rows={compact ? 3 : 6} maxLength={1000} className="field" value={content} onChange={(event) => setContent(event.target.value)} autoFocus={compact} />
    </label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex gap-3">
      <button disabled={busy} className="btn-outline btn-sm">{busy ? 'Mengirim…' : parentId ? 'Kirim balasan' : 'Kirim komentar'}</button>
      {onCancel && <button type="button" onClick={onCancel} className="text-sm text-graphite hover:text-black">Batal</button>}
    </div>
  </form>;
}

export function CommentsSection({ recipeId }: { recipeId: number }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);

  const load = useCallback(async (pageNumber: number) => {
    setError('');
    try {
      const result = await commentApi.list(recipeId, { page: pageNumber, size: 10 });
      if (!result.data) { setError(result.error?.message ?? 'Komentar gagal dimuat.'); return; }
      const data = result.data;
      setComments((current) => pageNumber === 1 ? data.content : [...current, ...data.content]);
      setTotal(data.totalComments); setPage(pageNumber); setHasNext(data.hasNext);
    } catch { setError(CONNECTION_ERROR); }
  }, [recipeId]);
  useEffect(() => { void load(1); }, [load]);

  async function remove(comment: Comment) {
    if (!window.confirm(comment.parentId === null && comment.replies.length ? 'Hapus komentar ini beserta balasannya?' : 'Hapus komentar ini?')) return;
    const result = await commentApi.remove(comment.id).catch(() => null);
    if (!result || result.error) { setError(result?.error?.message ?? CONNECTION_ERROR); return; }
    await load(1);
  }

  function Item({ comment }: { comment: Comment }) {
    const canDelete = user && (user.id === comment.author.id || user.role === 'ADMIN');
    return <div className="flex gap-4">
      <Avatar name={comment.author.name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4">
          <p className="font-bold">{comment.author.name}</p>
          <div className="flex gap-4 text-sm">
            {user && comment.parentId === null && <button type="button" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="font-bold hover:text-olive">Balas</button>}
            {canDelete && <button type="button" onClick={() => void remove(comment)} className="text-red-700 hover:underline">Hapus</button>}
          </div>
        </div>
        <p className="text-xs text-silver">{formatDate(comment.createdAt, true)}</p>
        <p className="mt-2 whitespace-pre-line break-words text-sm text-graphite">{comment.content}</p>
      </div>
    </div>;
  }

  return <section aria-labelledby="judul-komentar" className="page max-w-4xl py-16 sm:py-20">
    <h2 id="judul-komentar" className="text-center text-4xl">{total} Komentar</h2>
    {error && <p role="alert" className="mt-6 text-sm text-red-700">{error}</p>}
    <ul className="mt-10 space-y-8">
      {comments.map((comment) => <li key={comment.id}>
        <Item comment={comment} />
        {(comment.replies.length > 0 || replyTo === comment.id) && <ul className="ml-8 mt-6 space-y-6 border-l border-dotted border-black/30 pl-6 sm:ml-16">
          {comment.replies.map((reply) => <li key={reply.id}><Item comment={reply} /></li>)}
          {replyTo === comment.id && <li><CommentForm compact recipeId={recipeId} parentId={comment.id} onCancel={() => setReplyTo(null)} onPosted={() => { setReplyTo(null); void load(1); }} /></li>}
        </ul>}
      </li>)}
    </ul>
    {hasNext && <div className="mt-10 text-center"><button type="button" onClick={() => void load(page + 1)} className="btn-outline btn-sm">Muat komentar lainnya</button></div>}
    <div className="mt-16 border-t border-dotted border-black/40 pt-12">
      <h3 className="text-center text-2xl">Tulis komentar</h3>
      <div className="mt-8">{user ? <CommentForm recipeId={recipeId} parentId={null} onPosted={() => void load(1)} /> : <div className="text-center"><LoginPrompt action="menulis komentar" /></div>}</div>
    </div>
  </section>;
}
