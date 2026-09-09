import type { FacilityMapConfig, FacilityMapSymbol, FacilityPackage, MapSymbolKind, StudioLayer } from '../facility/types';
import { deleteArea, mergeAreas, updateArea, validateMapDraft, type MapEditorDraft, type MapObjectRef, type MapPoint } from './mapEditor';

export const symbolKinds: MapSymbolKind[] = ['door','double-door','sliding-door','rollup-door','stairs','column','window','dock','drain','barrier','custom'];
export const layerNames: Record<StudioLayer, string> = { reference: 'Reference drawing', areas: 'Rooms & labels', walls: 'Walls', symbols: 'Doors, stairs & symbols', equipment: 'Equipment placements', markup: 'Markup', masks: 'Reference cleanup' };
export const layerOf = (ref: MapObjectRef): StudioLayer => ({area:'areas', wall:'walls', annotation:'markup', symbol:'symbols', mask:'masks', marker:'equipment'} as const)[ref.kind];
export const layerState = (config: FacilityMapConfig, layer: StudioLayer) => config.studio?.layers?.[layer] ?? {visible:true, locked:layer === 'reference'};
export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0,8)}`;
export const snapPoint = (p: MapPoint, snap = .5): MapPoint => ({x: Math.max(0,Math.min(100,snap ? Math.round(p.x/snap)*snap : p.x)),y: Math.max(0,Math.min(100,snap ? Math.round(p.y/snap)*snap : p.y))});
export function changeStudio(draft: MapEditorDraft, patch: Partial<NonNullable<FacilityMapConfig['studio']>>): MapEditorDraft {
  return {...draft,mapConfig:{...draft.mapConfig,studio:{...draft.mapConfig.studio,...patch}}};
}
export function makeSymbol(kind: MapSymbolKind, box = {x:45,y:45,width:3,height:5}): FacilityMapSymbol {
  return {id:uid('symbol'),kind,label:kind.replaceAll('-',' '),...box,rotation:0,steps:7,direction:'up'};
}
export function validateStudio(config: FacilityMapConfig): string[] {
  const errors: string[] = [], ids = new Set<string>();
  const studio = config.studio;
  if (!studio) return errors;
  const boxValid = (s: {x:number;y:number;width:number;height:number}) => [s.x,s.y,s.width,s.height].every(Number.isFinite) && s.x >= 0 && s.y >= 0 && s.width >= .1 && s.height >= .1 && s.x+s.width <= 100.001 && s.y+s.height <= 100.001;
  for (const s of [...(studio.symbols??[]),...(studio.masks??[]),...(studio.templates??[])]) {
    if (!s.id || ids.has(s.id) || !boxValid(s)) errors.push('Invalid or duplicate studio object: '+s.id);
    ids.add(s.id);
  }
  for (const s of [...(studio.symbols??[]),...(studio.templates??[])]) {
    if (!symbolKinds.includes(s.kind) || !Number.isFinite(s.rotation) || (s.steps !== undefined && (!Number.isInteger(s.steps) || s.steps<2 || s.steps>30))) errors.push('Invalid symbol properties: '+s.id);
    if (s.paths && (s.paths.length > 100 || s.paths.some(path=> path.length<2 || path.length>500 || path.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>100||p.y>100)))) errors.push('Invalid custom symbol paths: '+s.id);
  }
  if (studio.snap !== undefined && (!Number.isFinite(studio.snap)||studio.snap<0||studio.snap>10)) errors.push('Invalid snapping interval.');
  if (studio.referenceOpacity !== undefined && (!Number.isFinite(studio.referenceOpacity)||studio.referenceOpacity<0||studio.referenceOpacity>1)) errors.push('Invalid reference opacity.');
  return errors;
}
export function objectLabel(d: MapEditorDraft, r: MapObjectRef): string {
  return r.kind==='area' ? d.areas.find(a=>a.id===r.id)?.name??r.id : r.kind==='symbol' ? d.mapConfig.studio?.symbols?.find(s=>s.id===r.id)?.label??r.id : r.kind==='marker' ? d.mapConfig.markers?.find(s=>s.id===r.id)?.label??r.id : r.id;
}
export function allObjects(d: MapEditorDraft): MapObjectRef[] {
  return [...d.areas.map(a=>({kind:'area' as const,id:a.id})),...(d.mapConfig.walls??[]).map(a=>({kind:'wall' as const,id:a.id})),...(d.mapConfig.annotations??[]).map(a=>({kind:'annotation' as const,id:a.id})),...(d.mapConfig.markers??[]).map(a=>({kind:'marker' as const,id:a.id})),...(d.mapConfig.studio?.symbols??[]).map(a=>({kind:'symbol' as const,id:a.id})),...(d.mapConfig.studio?.masks??[]).map(a=>({kind:'mask' as const,id:a.id}))];
}
export type StudioAction = {op:'move';targets:MapObjectRef[];dx:number;dy:number} | {op:'delete'|'duplicate'|'flip';targets:MapObjectRef[]} | {op:'rotate';targets:MapObjectRef[];angle:number} | {op:'rename';targets:MapObjectRef[];name:string} | {op:'resize';targets:MapObjectRef[];width:number;height:number} | {op:'merge';targets:MapObjectRef[];name:string};
export function applyActions(draft: MapEditorDraft, actions: StudioAction[], pkg: FacilityPackage): MapEditorDraft {
  let d = structuredClone(draft);
  if (!actions.length || actions.length>30) throw new Error('Provide between one and thirty edits.');
  for (const action of actions) {
    if (!Array.isArray(action.targets) || !action.targets.length) throw new Error('Select the objects to edit.');
    const known=allObjects(d);
    for (const r of action.targets) {
      if (!known.some(k=>k.id===r.id&&k.kind===r.kind)) throw new Error('The target no longer exists: '+r.id);
      if (layerState(d.mapConfig,layerOf(r)).locked || !layerState(d.mapConfig,layerOf(r)).visible) throw new Error('Show and unlock '+layerNames[layerOf(r)]+' before editing.');
    }
    if (action.op==='merge') {
      if (action.targets.some(t=>t.kind!=='area')) throw new Error('Select only rooms to merge.');
      const ids=action.targets.map(t=>t.id), survivor=ids.includes(pkg.featureConfig.defaultAreaId)?pkg.featureConfig.defaultAreaId:ids[0];
      d=mergeAreas(d,{...pkg,assets:d.assets??pkg.assets},ids,survivor,action.name).draft; continue;
    }
    for (const r of action.targets) {
      if (action.op==='delete') {
        if(r.kind==='area') d=deleteArea(d,{...pkg,assets:d.assets??pkg.assets},r.id);
        if(r.kind==='symbol') d=changeStudio(d,{symbols:(d.mapConfig.studio?.symbols??[]).filter(s=>s.id!==r.id)});
        if(r.kind==='mask') d=changeStudio(d,{masks:(d.mapConfig.studio?.masks??[]).filter(s=>s.id!==r.id)});
        if(r.kind==='wall') d.mapConfig.walls=d.mapConfig.walls?.filter(s=>s.id!==r.id);
        if(r.kind==='annotation') d.mapConfig.annotations=d.mapConfig.annotations?.filter(s=>s.id!==r.id);
        if(r.kind==='marker') d.mapConfig.markers=d.mapConfig.markers?.filter(s=>s.id!==r.id);
        continue;
      }
      const transform = <T extends {id:string;label?:string;x?:number;y?:number;points?:MapPoint[];width?:number;height?:number;rotation?:number;flipped?:boolean}>(s:T):T => {
        if(s.id!==r.id) return s;
        if(action.op==='rename') return {...s,label:action.name};
        if(action.op==='move') {
          if(![action.dx,action.dy].every(Number.isFinite)) throw new Error('Movement must be numeric.');
          return s.points ? {...s,points:s.points.map(p=>({x:p.x+action.dx,y:p.y+action.dy}))} : {...s,x:(s.x??0)+action.dx,y:(s.y??0)+action.dy};
        }
        if(action.op==='resize') {
          if(s.width===undefined) throw new Error('Resize rooms, symbols, or reference cleanup boxes.');
          return {...s,width:action.width,height:action.height};
        }
        if(action.op==='rotate'||action.op==='flip') {
          if(r.kind!=='symbol') throw new Error('Rotation and flip apply to symbols.');
          if(action.op==='rotate'&&!Number.isFinite(action.angle)) throw new Error('Rotation must be numeric.');
          return action.op==='flip'?{...s,flipped:!s.flipped}:{...s,rotation:((s.rotation??0)+('angle' in action?action.angle:0))%360};
        }
        throw new Error('Unsupported edit.');
      };
      if(action.op==='duplicate') {
        if(r.kind==='symbol') { const s=d.mapConfig.studio!.symbols!.find(s=>s.id===r.id)!; d=changeStudio(d,{symbols:[...d.mapConfig.studio!.symbols!,{...s,id:uid('symbol'),x:Math.min(100-s.width,s.x+1),y:Math.min(100-s.height,s.y+1)}]}); }
        else if(r.kind==='wall') {const s=d.mapConfig.walls!.find(s=>s.id===r.id)!;d.mapConfig.walls!.push({...s,id:uid('wall')});}
        else if(r.kind==='annotation') {const s=d.mapConfig.annotations!.find(s=>s.id===r.id)!;d.mapConfig.annotations!.push({...s,id:uid('annotation')});}
        else throw new Error('Duplicate symbols, walls or markup; equipment placements retain one asset identity.');
        continue;
      }
      if(r.kind==='area') {
        const a=d.areas.find(a=>a.id===r.id)!;
        if(action.op==='rename') d=updateArea(d,r.id,{name:action.name});
        else if(action.op==='move') d=updateArea(d,r.id,{overlay:{...a.overlay,x:a.overlay.x+action.dx,y:a.overlay.y+action.dy,polygon:a.overlay.polygon?.map(p=>({x:p.x+action.dx,y:p.y+action.dy}))}});
        else if(action.op==='resize'&&!a.overlay.polygon) d=updateArea(d,r.id,{overlay:{...a.overlay,width:action.width,height:action.height}});
        else throw new Error('Use shape vertices for polygon resizing; rotation applies to symbols.');
      }
      if(r.kind==='symbol') d=changeStudio(d,{symbols:d.mapConfig.studio?.symbols?.map(transform)});
      if(r.kind==='mask') d=changeStudio(d,{masks:d.mapConfig.studio?.masks?.map(transform)});
      if(r.kind==='wall') d.mapConfig.walls=d.mapConfig.walls?.map(transform);
      if(r.kind==='marker') d.mapConfig.markers=d.mapConfig.markers?.map(transform);
      if(r.kind==='annotation') d.mapConfig.annotations=d.mapConfig.annotations?.map(s=> {const next=transform(s);return action.op==='rename'&&'text' in next?{...next,text:action.name}:next;});
    }
  }
  const errors=[...validateMapDraft({...pkg,assets:d.assets??pkg.assets},d),...validateStudio(d.mapConfig)];
  for(const item of [...(d.mapConfig.annotations??[]),...(d.mapConfig.markers??[])]) {
    const points='points' in item?item.points:[{x:item.x,y:item.y}];
    if(points.some(p=>![p.x,p.y].every(Number.isFinite)||p.x<0||p.x>100||p.y<0||p.y>100)) errors.push('The edit would move an object outside the map.');
  }
  if(errors.length) throw new Error(errors[0]);
  return d;
}
