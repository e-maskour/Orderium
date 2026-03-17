import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@orderium/ui/styles.css';
import './theme.css';
import './GlobalOverlayPanel.css';
import './DataTableTheme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Note: Firebase messaging service worker is registered automatically by firebase.ts
// No need to register sw.js separately to avoid conflicts
