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
import { activeFacilitySelectionError } from './facility/activeFacility';
import AppErrorBoundary from './ui/AppErrorBoundary';
import { applyAppSettings } from './lib/appSettings';
import './features/facility-guide/guide.css';
import './ui/chrome-clearance.css';

applyAppSettings();

ReactDOM.createRoot(document.getElementById('root')!).render(
  activeFacilitySelectionError
    ? <main role="alert" style={{ maxWidth: 720, margin: '10vh auto', padding: 24, color: '#f4f7fb', background: '#17202a', fontFamily: 'system-ui' }}><h1>Facility could not be loaded</h1><p>{activeFacilitySelectionError.message}</p><p>Choose a registered facility ID or remove the facility parameter to load the default facility.</p></main>
    : <React.StrictMode><AppErrorBoundary><FacilityProvider><GuideProvider><App /></GuideProvider></FacilityProvider></AppErrorBoundary></React.StrictMode>,
);

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' }).catch(() => undefined);
}
