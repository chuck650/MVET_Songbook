import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../styles/variables.css';

import { loadRuntimeConfig } from '../utils/resolvePath';

void (async () => {
  await loadRuntimeConfig();
  
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();
