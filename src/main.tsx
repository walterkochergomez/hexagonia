import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/atkinson-hyperlegible-next';
import './styles/tokens.css';
import './styles/app.css';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(<App />);
