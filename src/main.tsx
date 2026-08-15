import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './dashboard.css';
import './motion/tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
}
