import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './dashboard.css';
import './ui/system.css';
import './ui/layout-repair.css';
import './ui/reference-shell.css';
import './ui/industrial-design-system.css';
import './ui/industrial-fixes.css';
import './ui/visual-audit-fixes.css';
import './motion/tokens.css';
import { GuideProvider } from './features/facility-guide';
import { FacilityProvider } from './facility';
import { applyAppSettings } from './lib/appSettings';
import './features/facility-guide/guide.css';
import './ui/responsive-chrome-fixes.css';

applyAppSettings();

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><FacilityProvider><GuideProvider><App /></GuideProvider></FacilityProvider></React.StrictMode>);

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' }).catch(() => undefined);
}
