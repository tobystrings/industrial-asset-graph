import { useState } from 'react';
import ControlCabinetView from './ControlCabinetView';
import Dashboard from './Dashboard';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'cabinet'>(() => new URLSearchParams(location.search).get('view') === 'cabinet' ? 'cabinet' : 'dashboard');
  const changeView = (next: 'dashboard' | 'cabinet') => { setView(next); const params = new URLSearchParams(location.search); next === 'cabinet' ? params.set('view', 'cabinet') : params.delete('view'); history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`); };
  return view === 'cabinet' ? <ControlCabinetView onBack={() => changeView('dashboard')} /> : <Dashboard onOpenCabinet={() => changeView('cabinet')} />;
}
