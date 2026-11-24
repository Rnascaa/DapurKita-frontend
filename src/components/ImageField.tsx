import { useId, useState } from 'react';
import { imageApi } from '../api';
import { imageFileError } from '../features/community/validation';
import { Photo } from './Decor';

/** Unggah foto (ADMIN) dengan pratinjau; URL luar tetap bisa ditempel. */
export function ImageField({ label, value, onChange, error }: { label: string; value: string | null; onChange: (value: string | null) => void; error?: string }) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');
  async function upload(file: File | undefined) {
    if (!file) return;
    const localError = imageFileError(file);
    if (localError) { setUploadError(localError); return; }
    setUploadError(''); setBusy(true);
    try {
      const result = await imageApi.upload(file);
      if (result.data) onChange(result.data.url);
      else setUploadError(result.error?.errors?.find((item) => item.field === 'file')?.message ?? result.error?.message ?? 'Foto gagal diunggah.');
    } catch {
      setUploadError('Tidak dapat terhubung ke server. Coba lagi.');
    } finally { setBusy(false); }
  }
  return <div>
    <p className="field-label">{label}</p>
    <div className="mt-2 grid gap-4 sm:grid-cols-[12rem_1fr]">
      <Photo src={value} className="aspect-[4/3] w-full border border-black/10" />
      <div className="flex flex-col justify-center gap-3">
        <label htmlFor={inputId} className={`btn-outline btn-sm self-start ${busy ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>{busy ? 'Mengunggah…' : value ? 'Ganti foto' : 'Unggah foto'}</label>
        <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy}
          onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
        <p className="text-xs text-graphite">JPEG, PNG, atau WebP, maksimal 5 MB.</p>
        <label className="text-xs text-graphite">atau tempel URL foto
          <input type="url" className="field mt-1 py-2" value={value ?? ''} placeholder="https://…" maxLength={2048} onChange={(event) => onChange(event.target.value || null)} />
        </label>
        {value && <button type="button" className="self-start text-xs font-bold text-red-700 hover:underline" onClick={() => onChange(null)}>Hapus foto</button>}
      </div>
    </div>
    {(uploadError || error) && <p role="alert" className="field-error">{uploadError || error}</p>}
  </div>;
}
