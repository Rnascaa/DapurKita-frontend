import { useEffect } from 'react';

/** Tanpa argumen menghasilkan judul situs saja, untuk beranda. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · DapurKita` : 'DapurKita';
  }, [title]);
}
