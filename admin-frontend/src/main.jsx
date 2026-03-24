import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AdminI18nProvider } from './lib/i18n';
import './styles.css';
import { registerAdminServiceWorker } from './lib/pwa';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminI18nProvider>
        <App />
      </AdminI18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);

registerAdminServiceWorker();
