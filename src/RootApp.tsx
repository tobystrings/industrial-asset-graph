import { useState } from 'react';
import { Legacy3DView } from './App';
import Dashboard from './Dashboard';

export default function RootApp() {
  const [view, setView] = useState<'2d' | '3d'>(() => location.hash === '#3d' ? '3d' : '2d');
  const change = (next: '2d' | '3d') => { setView(next); location.hash = next === '3d' ? '3d' : ''; };
  return view === '3d' ? <div className="legacy-wrapper"><button className="return-dashboard" onClick={() => change('2d')}>← Facility dashboard</button><Legacy3DView /></div> : <Dashboard onOpen3D={() => change('3d')} />;
}
