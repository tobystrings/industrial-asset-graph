import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { buildTestFacilityPackage } from '../../facilities/test-facility';
import { createHistory, draftFromPackage, mergeAreas, pushHistory, redoHistory, splitArea, undoHistory } from './mapEditor';
import { applyActions, changeStudio, makeSymbol, validateStudio } from './studioModel';
import { parseCommands } from './studioCommands';
import { exportPlantArchive, importPlantArchive, loadPlant, savePlant } from '../facility/runtimeDb';
import { validateFacilityPackage } from '../facility/schema';
import { applyCanonicalEntities } from '../facility/syncClient';

describe('Map Studio editing transactions',()=>{
 beforeEach(()=>Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:new IDBFactory()}));
 it('keeps raster cleanup anchored through move, delete, undo and redo',()=>{
  const pkg=buildTestFacilityPackage(),symbol=makeSymbol('door');
  const source=changeStudio(draftFromPackage(pkg),{symbols:[symbol],masks:[{id:'source-mask',label:'Source door',x:45,y:45,width:3,height:5}]});
  const moved=applyActions(source,[{op:'move',targets:[{kind:'symbol',id:symbol.id}],dx:8,dy:3}],pkg);
  const removed=applyActions(moved,[{op:'delete',targets:[{kind:'symbol',id:symbol.id}]}],pkg);
  expect(removed.mapConfig.studio?.masks).toEqual(source.mapConfig.studio?.masks);
  expect(removed.mapConfig.studio?.symbols).toHaveLength(0);
  const history=pushHistory(pushHistory(createHistory(source),moved),removed);
  expect(undoHistory(history).present).toEqual(moved);
  expect(redoHistory(undoHistory(history)).present).toEqual(removed);
 });
 it('parses selected and named edits; rejects ambiguous and partial instructions atomically',()=>{
  const pkg=buildTestFacilityPackage(),d=draftFromPackage(pkg),ref={kind:'area' as const,id:d.areas[0].id};
  const actions=parseCommands('rename this to Main Cooler; move this left 1',d,[ref]);
  const changed=applyActions(d,actions,pkg);
  expect(changed.areas[0].name).toBe('Main Cooler');expect(d.areas[0].name).not.toBe('Main Cooler');
  expect(()=>parseCommands('rename this to Main Cooler; set the boiler pressure',d,[ref])).toThrow();
  expect(()=>parseCommands('flip this',d,[])).toThrow(/Select/);
  const duplicate={...d,areas:[...d.areas,{...d.areas[0],id:'another-room'}]};
  expect(()=>parseCommands('rename '+d.areas[0].name+' to Main Cooler',duplicate,[])).toThrow(/More than one/);
 });
 it('rejects locked, unknown and out-of-bounds targets without mutating the draft',()=>{
  const pkg=buildTestFacilityPackage(),symbol=makeSymbol('stairs');
  const d=changeStudio(draftFromPackage(pkg),{symbols:[symbol],layers:{symbols:{visible:true,locked:true}}});
  const ref={kind:'symbol' as const,id:symbol.id};
  expect(()=>applyActions(d,[{op:'move',targets:[ref],dx:1,dy:0}],pkg)).toThrow(/unlock/);
  const unlocked=changeStudio(d,{layers:{}});
  expect(()=>applyActions(unlocked,[{op:'move',targets:[ref],dx:1000,dy:0}],pkg)).toThrow();
  expect(()=>applyActions(unlocked,[{op:'delete',targets:[{kind:'symbol',id:'missing'}]}],pkg)).toThrow(/no longer/);
  expect(unlocked.mapConfig.studio?.symbols?.[0]).toEqual(symbol);
  expect(validateStudio({studio:{symbols:[{...symbol,steps:NaN}]}})).not.toHaveLength(0);
 });
 it('restores asset assignments and location edges with undo after splitting a room',()=>{
  const pkg=buildTestFacilityPackage(),d=draftFromPackage(pkg),asset=pkg.assets[0];
  const result=splitArea(d,pkg,asset.areaId,'split-room','Second room','vertical',{[asset.id]:'split-room'});
  expect(result.draft.assets?.[0].areaId).toBe('split-room');
  const history=pushHistory(createHistory(d),result.draft);
  expect(undoHistory(history).present.assets).toEqual(pkg.assets);
  expect(undoHistory(history).present.relationships).toEqual(pkg.relationships);
  expect(redoHistory(undoHistory(history)).present.assets?.[0].areaId).toBe('split-room');
 });
 it('moves location relationships when adjacent rooms merge',()=>{
  const pkg=buildTestFacilityPackage();const a=pkg.areas[0];
  const second={...a,id:'second',name:'Second',shortName:'Second',overlay:{...a.overlay,x:a.overlay.x+a.overlay.width},assetIds:['other']};
  const asset={...pkg.assets[0],id:'other',areaId:'second'};
  const source={...pkg,areas:[a,second],assets:[...pkg.assets,asset],relationships:[...pkg.relationships,{id:'location-edge',source:'other',target:'second',type:'LOCATED_IN' as const,verificationStatus:'FIELD_VERIFY' as const,evidenceIds:[]}]};
  const merged=mergeAreas(draftFromPackage(source),source,[a.id,second.id],a.id,'Combined');
  expect(merged.draft.relationships?.find(r=>r.id==='location-edge')?.target).toBe(a.id);
 });
 it('rejects a stale window save atomically without replacing newer records',async()=>{
  const pkg=buildTestFacilityPackage();await savePlant(pkg,pkg.facility.id);
  await savePlant({...pkg,packageRevision:pkg.packageRevision+1},pkg.facility.id,pkg.packageRevision);
  await expect(savePlant({...pkg,packageRevision:pkg.packageRevision+1,mapConfig:{drawingTitle:'Stale'}},pkg.facility.id,pkg.packageRevision)).rejects.toThrow(/Another window/);
  expect((await loadPlant(pkg.facility.id))?.mapConfig?.drawingTitle).not.toBe('Stale');
 });
 it('preserves symbols, masks, layer settings and templates through database and canonical transport',async()=>{
  const pkg=buildTestFacilityPackage();const d=changeStudio(draftFromPackage(pkg),{symbols:[makeSymbol('stairs')],masks:[{id:'mask',label:'Old stairs',x:40,y:40,width:3,height:5}],templates:[{...makeSymbol('custom'),id:'template'}],layers:{reference:{visible:false,locked:true}},snap:.25});
  const next={...pkg,...d};validateFacilityPackage(next);await savePlant(next,pkg.facility.id);
  expect((await loadPlant(pkg.facility.id))?.mapConfig).toEqual(next.mapConfig);
  const archive=await exportPlantArchive(pkg.facility.id);
  const restored=await importPlantArchive(archive,'replace',pkg.facility.id);
  expect(restored.mapConfig?.studio).toEqual(next.mapConfig?.studio);
  const synced=applyCanonicalEntities(pkg,[{entityId:'map-config:'+pkg.facility.id,entityType:'map_config',version:1,deleted:false,value:d} as never]);
  expect(synced.mapConfig).toEqual(next.mapConfig);
 });
});
