import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './dashboard.css';
import './ui/system.css';
import './ui/layout-repair.css';
import './motion/tokens.css';
import { GuideProvider } from './features/facility-guide';
import { FacilityProvider } from './facility';
import './features/facility-guide/guide.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><FacilityProvider><GuideProvider><App /></GuideProvider></FacilityProvider></React.StrictMode>);

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' }).catch(() => undefined);
}
