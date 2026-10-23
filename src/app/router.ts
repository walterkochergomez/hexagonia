import { useEffect, useState } from 'react';

export function useRoute(): string[] {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const f = () => setHash(location.hash);
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean);
}

export function go(path: string) {
  location.hash = `#/${path}`;
}

export function roomLink(code: string): string {
  const url = new URL(location.href);
  url.hash = `#/sala/${code}`;
  return url.toString();
}
