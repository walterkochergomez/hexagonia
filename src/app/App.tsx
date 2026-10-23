import { useEffect } from 'react';
import { usePrefs } from './prefs';
import { useRoute } from './router';
import { Home } from '../ui/Home';
import { LocalGame, LocalSetup } from '../ui/LocalScreens';
import { Room } from '../ui/Room';
import { Rules } from '../ui/Rules';
import { normalizeCode } from '../net/protocol';

export function App() {
  const route = useRoute();
  const { lang } = usePrefs();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const [a, b] = route;
  if (a === 'sala' && b) return <Room key={b} code={normalizeCode(b)} />;
  if (a === 'local' && b === 'juego') return <LocalGame />;
  if (a === 'local') return <LocalSetup />;
  if (a === 'reglas') return <Rules />;
  return <Home />;
}
