import type { FacilityMapConfig, FacilityMapSymbol } from '../facility/types';
import { layerState } from './studioModel';

export function SymbolDrawing({symbol:s}:{symbol:FacilityMapSymbol}) {
  const steps=Array.from({length:s.steps??7},(_,i)=>i);
  return <g className="studio-symbol-geometry" transform={`translate(50 50) rotate(${s.rotation}) scale(${s.flipped?-1:1} 1) translate(-50 -50)`}>
    {s.kind==='door'&&<><path d="M0 100 V0 M0 100 A100 100 0 0 0 100 0"/><path d="M0 0 H100"/></>}
    {s.kind==='double-door'&&<><path d="M0 100 V0 H50 M100 100 V0 H50 M0 50 A50 50 0 0 0 50 0 M100 50 A50 50 0 0 1 50 0"/></>}
    {s.kind==='sliding-door'&&<><path d="M0 25 H100 M0 35 H50 V65 H0 Z M50 40 H100 V70 H50 Z M10 85 H90 M75 75 L90 85 75 95"/></>}
    {s.kind==='rollup-door'&&<><rect x="2" y="2" width="96" height="96"/>{steps.map(i=><path key={i} d={`M2 ${(i+1)*100/(steps.length+1)} H98`}/>)}</>}
    {s.kind==='stairs'&&<><rect x="2" y="2" width="96" height="96"/>{steps.map(i=><path key={i} d={`M2 ${(i+1)*100/(steps.length+1)} H98`}/>)}<path className="stair-arrow" d={s.direction==='down'?'M50 10 V90 M35 70 L50 90 65 70':'M50 90 V10 M35 30 L50 10 65 30'}/></>}
    {s.kind==='column'&&<><rect x="5" y="5" width="90" height="90"/><path d="M5 5 L95 95 M95 5 L5 95"/></>}
    {s.kind==='window'&&<><rect x="2" y="35" width="96" height="30"/><path d="M2 50 H98 M50 35 V65"/></>}
    {s.kind==='dock'&&<><path d="M2 2 V98 H98 V2 M2 70 H98 M2 80 H98 M2 90 H98 M50 10 V60 M35 45 L50 60 65 45"/></>}
    {s.kind==='drain'&&<><circle cx="50" cy="50" r="45"/><path d="M20 25 H80 M8 40 H92 M8 55 H92 M16 70 H84"/></>}
    {s.kind==='barrier'&&<><rect x="2" y="35" width="96" height="30"/><path d="M10 65 L30 35 M35 65 L55 35 M60 65 L80 35"/></>}
    {s.kind==='custom'&&(s.paths?.length?s.paths.map((p,i)=><polyline key={i} points={p.map(p=>`${p.x},${p.y}`).join(' ')}/>):<rect x="5" y="5" width="90" height="90"/>)}
  </g>;
}
export function StudioSymbol({symbol:s,width,height}:{symbol:FacilityMapSymbol;width:number;height:number}) {
  return <svg x={s.x/100*width} y={s.y/100*height} width={s.width/100*width} height={s.height/100*height} viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible"><rect width="100" height="100" fill="white" pointerEvents="none"/><SymbolDrawing symbol={s}/></svg>;
}
export function ReferenceCleanup({config,width,height}:{config:FacilityMapConfig;width:number;height:number}) {
  // Source masks are anchored to the old raster pixels, independently of replacement objects.
  return <g aria-label="Reference cleanup" pointerEvents="none">{(config.studio?.masks??[]).map(m=><rect key={m.id} data-mask-id={m.id} x={m.x/100*width} y={m.y/100*height} width={m.width/100*width} height={m.height/100*height} fill="white"/>)}</g>;
}
export function SavedStudioSymbols({config,width,height}:{config:FacilityMapConfig;width:number;height:number}) {
  return layerState(config,'symbols').visible?<g aria-label="Saved editable symbols">{config.studio?.symbols?.map(s=><g key={s.id} data-symbol-id={s.id}><title>{s.label}</title><StudioSymbol symbol={s} width={width} height={height}/></g>)}</g>:null;
}
