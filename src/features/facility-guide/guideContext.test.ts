import { describe, expect, it } from 'vitest';
import baseline from '../../facility/activeFacility';
import { emptyAssetProduction } from '../../facility/production';
import { buildGuideContext } from './guideContext';
describe('Genie facility context', () => {
  it('rejects stale or cross-facility selections without substituting an asset', () => {
    expect(buildGuideContext(baseline,{page:'asset',assetId:'missing'}).assetId).toBeUndefined();
    const pkg = structuredClone(baseline); pkg.assets[0].facilityId = 'other';
    expect(buildGuideContext(pkg,{page:'asset',assetId:pkg.assets[0].id}).assetId).toBeUndefined();
  });
  it('uses live weighted required documents and does not invent a zero when no checklist exists', () => {
    const pkg = structuredClone(baseline); const asset = pkg.assets[0];
    pkg.documents = [];
    expect(buildGuideContext(pkg,{page:'asset',assetId:asset.id}).documentationPercent).toBeUndefined();
    pkg.documents = [
      {id:'d1',assetId:asset.id,category:'manual',title:'Manual',path:'',state:'COMPLETE',required:true,verificationStatus:'FIELD_VERIFY',evidenceIds:[]},
      {id:'d2',assetId:asset.id,category:'drawing',title:'Drawing',path:'',state:'IN_PROGRESS',required:true,verificationStatus:'FIELD_VERIFY',evidenceIds:[]},
    ];
    expect(buildGuideContext(pkg,{page:'asset',assetId:asset.id}).documentationPercent).toBe(75);
  });
  it('distinguishes individual verified facts from unverified field-sheet values and keeps zero', () => {
    const pkg = structuredClone(baseline); const a = pkg.assets[0];
    a.facts = [{label:'Voltage',value:{value:0,verificationStatus:'DISPUTED',evidenceIds:[]}}];
    a.production = {...emptyAssetProduction(), electrical:{'Electrical source':'Panel Z','Control voltage':'unknown'}};
    const c = buildGuideContext(pkg,{page:'maintenance',assetId:a.id});
    expect(c.facts?.find(f => f.label === 'Voltage')).toMatchObject({value:'0',state:'DISPUTED'});
    expect(c.facts?.find(f => f.label === 'Electrical source')?.state).toBe('UNVERIFIED');
    expect(c.electricalGaps).not.toContain('Electrical source');
    expect(c.electricalGaps).toContain('Control voltage');
  });
  it('counts direct electrical edges only with verified state and existing evidence, excluding containment', () => {
    const pkg = structuredClone(baseline); const a = pkg.assets[0];
    pkg.evidence = [{id:'e1',type:'DRAWING',title:'Test',pathOrUrl:'test',access:'LOCAL_ONLY'}];
    pkg.relationships = [
      {id:'location',source:'room',target:a.id,type:'CONTAINS',verificationStatus:'VERIFIED',evidenceIds:['e1']},
      {id:'no-source',source:'panel',target:a.id,type:'FEEDS',verificationStatus:'VERIFIED',evidenceIds:['absent']},
      {id:'unverified',source:'panel',target:a.id,type:'FEEDS',verificationStatus:'FIELD_VERIFY',evidenceIds:['e1']},
      {id:'feed',source:'panel',target:a.id,type:'FEEDS',verificationStatus:'VERIFIED',evidenceIds:['e1']},
    ];
    const before = JSON.stringify(pkg);
    const c = buildGuideContext(pkg,{page:'relationships',assetId:a.id,connectionId:'feed'});
    expect(c.relationshipCount).toBe(4); expect(c.upstreamCount).toBe(1); expect(c.downstreamCount).toBe(0);
    expect(c.connectionId).toBe('feed'); expect(JSON.stringify(pkg)).toBe(before);
  });
});
