import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against unwanted full-page reloads in development environments
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeFullReload', (payload: any) => {
    const pathStr = String(payload?.path || '').toLowerCase();
    if (pathStr.includes('store') || pathStr.includes('json') || pathStr.includes('data')) {
      console.warn('[Dalani Client] Blocked unwanted reload triggered by data persistence.');
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
