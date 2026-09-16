import { portablePlantPackage } from '../facility/runtimeDb';
import { describe, expect, it } from 'vitest';
import { buildLiebFoodsPackage } from '../../facilities/lieb-foods';
import { withClimax } from '../../facilities/lieb-foods/climax';
import { CLIMAX_CABINET } from '../../facilities/lieb-foods/climaxImages';
import { validateFacilityPackage } from '../facility/schema';
import { connections, imageViews } from './model';
import { himBackupStatus } from '../lib/himBackup';
describe('equipment photo navigation', () => {
  it('preserves stable identities, geometry and verified edits on repeated imports', () => {
    const pkg = buildLiebFoodsPackage();
    const views = imageViews(pkg,CLIMAX_CABINET);
    expect(views).toHaveLength(4);
    expect(views[1].regions).toHaveLength(11);
    views[1].regions[0].x = .36;
    pkg.components.find(c => c.id === views[1].regions[0].entityId)!.label = 'Reviewed label';
    const again = withClimax(pkg);
    expect(again).toEqual(pkg);
    expect(() => validateFacilityPackage(again)).not.toThrow();
    expect(again.mapConfig?.markers?.some(m => m.assetId === CLIMAX_CABINET)).toBe(false);
  });
  it('reuses a field-authored cabinet with a familiar type label', () => {
    const pkg = buildLiebFoodsPackage();
    pkg.featureConfig.imageViews = [];
    const cabinet = pkg.assets.find(a=>a.id===CLIMAX_CABINET)!;
    cabinet.id='field-cabinet'; cabinet.type='Control Cabinet'; cabinet.componentIds=[];
    pkg.components=pkg.components.filter(c=>c.parentId!==CLIMAX_CABINET);
    pkg.relationships=pkg.relationships.filter(r=>r.source!==CLIMAX_CABINET);
    pkg.areas.forEach(a=>{a.assetIds=a.assetIds.map(id=>id===CLIMAX_CABINET?cabinet.id:id);});
    const next=withClimax(pkg);
    expect(next.assets.filter(a=>/climax/i.test(a.name)&&/cabinet/i.test(a.type))).toHaveLength(1);
    expect(imageViews(next,cabinet.id)).toHaveLength(4);
    expect(() => validateFacilityPackage(next)).not.toThrow();
  });
  it('never treats containment or PLC associations as a power connection', () => {
    const pkg = buildLiebFoodsPackage();
    const drive = imageViews(pkg,CLIMAX_CABINET)[1].regions[0].entityId;
    expect(connections(pkg,drive,'in')).toEqual([]);
    expect(connections(pkg,drive,'out')).toEqual([]);
    expect(pkg.components.find(c => c.id === drive)?.savedParameters).toBeUndefined();
  });
  it('follows branches and reverse process direction without recursive cycles', () => {
    const pkg = buildLiebFoodsPackage(), ids = imageViews(pkg,CLIMAX_CABINET)[1].regions.map(r => r.entityId);
    pkg.relationships.push(...[
      {id:'test-feed',source:ids[0],target:ids[1],type:'FEEDS' as const},
      {id:'test-control',source:ids[0],target:ids[2],type:'CONTROLS' as const},
      {id:'test-reverse',source:ids[0],target:ids[3],type:'DOWNSTREAM_OF' as const},
    ].map(r => ({...r,verificationStatus:'FIELD_VERIFY' as const,evidenceIds:['climax-photo-interior']})));
    expect(connections(pkg,ids[0],'out').map(r => r.otherId)).toEqual([ids[1],ids[2]]);
    expect(connections(pkg,ids[0],'in')[0].otherId).toBe(ids[3]);
    expect(connections(pkg,ids[1],'in')[0].otherId).toBe(ids[0]);
  });
  it('rejects misaligned and unrelated image regions', () => {
    const pkg = buildLiebFoodsPackage();
    imageViews(pkg,CLIMAX_CABINET)[1].regions[0].x = .99;
    expect(() => validateFacilityPackage(pkg)).toThrow(/image region/);
    imageViews(pkg,CLIMAX_CABINET)[1].regions[0].x = .1;
    imageViews(pkg,CLIMAX_CABINET)[1].regions[0].entityId = 'L2-CC-001';
    expect(() => validateFacilityPackage(pkg)).toThrow(/image region/);
  });
  it('requires a source for saved values and preserves zero values and units', () => {
    const pkg = buildLiebFoodsPackage();
    const component = pkg.components.find(c => c.parentId === CLIMAX_CABINET)!;
    component.savedParameters = [{id:'synthetic',sourceDocumentId:'synthetic-doc',verificationStatus:'FIELD_VERIFY',values:[{code:'P001',name:'Synthetic zero setting',value:0,unit:'Hz'}]}];
    expect(() => validateFacilityPackage(pkg)).toThrow(/saved parameter/);
    pkg.documents.push({id:'synthetic-doc',assetId:CLIMAX_CABINET,category:'Parameters',title:'Synthetic backup',path:'test.json',state:'DRAFT',required:false,verificationStatus:'FIELD_VERIFY',evidenceIds:['climax-photo-interior']});
    expect(() => validateFacilityPackage(pkg)).not.toThrow();
    expect(himBackupStatus(component.id,component.savedParameters).stored).toBe(true);
    expect(component.savedParameters[0].values[0].value).toBe(0);
    pkg.evidence.push({id:'private-backup',type:'OTHER',title:'Private backup',pathOrUrl:'private://backup',access:'LOCAL_ONLY'});
    pkg.documents.find(d=>d.id==='synthetic-doc')!.evidenceIds=['private-backup'];
    const portable=portablePlantPackage(pkg);
    expect(portable.components.find(c=>c.id===component.id)!.savedParameters).toEqual([]);
    expect(() => validateFacilityPackage(portable)).not.toThrow();
  });
});
