import { withClimaxImages } from './climaxImages';
import type { FacilityPackage } from '../../src/facility/types';
import type { RegisterEntry } from '../../src/types/facility';
import { ASSET_ID, evidence, REVISION } from '../../src/troubleshooting/catalog';

const sourceId='climax-source-'+evidence.acd.sha256.slice(0,12);
const originalId='climax-original-'+evidence.acd.sha256.slice(0,12);
const docId='climax-control-review-'+REVISION;
export const climaxComponents=[['plc','Saved controller configuration — 1769-L30ERM/A','PLC'],['bottle-conveyor','Bottle conveyor — project association','VFD'],['case-conveyor','Case conveyor — project association','VFD'],['servo','Vertical / horizontal motion — 2198-D032-ERS3 project entry','SERVO_DRIVE'],['pneumatics','Gripper, basket, clamps and rod lock — inferred assembly','PNEUMATIC_ASSEMBLY'],['io-1','Configured slot 1 — 1769-IQ16','REMOTE_IO'],['io-2','Configured slot 2 — 1769-IQ16','REMOTE_IO'],['io-3','Configured slot 3 — 1769-IQ16','REMOTE_IO'],['io-4','Configured slot 4 — 1769-OB16','REMOTE_IO'],['io-5','Configured slot 5 — 1769-OB16','REMOTE_IO'],['servo-supply','Configured servo supply — 2198-P031','POWER_SUPPLY']] as const;
/** Additive, idempotent import. Never overwrites field records or earlier source revisions. */
export function withClimax(original:FacilityPackage):FacilityPackage {
 if(original.facility.id!=='facility-j-lieb')return original;
 const pkg=structuredClone(original);
 // Honor an existing field-created Climax identity instead of manufacturing another machine.
 const existing=pkg.assets.find(a=>a.id===ASSET_ID)||pkg.assets.find(a=>!/cabinet/i.test(a.type)&&/climax/i.test(a.name+' '+a.manufacturer.value));
 const id=existing?.id??ASSET_ID;
 if(!existing){
  const fact={value:null,verificationStatus:'FIELD_VERIFY' as const,evidenceIds:[sourceId]};
  pkg.assets.push({id,name:'Line 2 Climax Drop Packer',description:'Owner-identified Climax drop packer. Association with saved Portland_Brewing_6759 project is preliminary; installed identity and location require machine-side validation.',type:'Packaging Machine',facilityId:pkg.facility.id,areaId:'area-location-unconfirmed',line:'Line 2',verificationStatus:'FIELD_VERIFY',manufacturer:{...fact,value:'Climax',note:'Owner identification; nameplate unverified.'},model:fact,serialNumber:fact,facts:[],componentIds:[],unknowns:['Installed PLC project match','Nameplate and floor location','Native L5X/L5K export','HMI labels and exact fault meanings','Electrical / pneumatic drawings and site-approved recovery procedures']});
  const area=pkg.areas.find(a=>a.id==='area-location-unconfirmed');if(area&&!area.assetIds.includes(id))area.assetIds.push(id);
 }
 if(!pkg.evidence.some(e=>e.id===sourceId))pkg.evidence.push({id:sourceId,type:'OTHER',title:'Climax saved-project source review · SHA-256 '+evidence.acd.sha256,pathOrUrl:'docs/machines/LIEB-L2-CLIMAX-6759/source-review.md',access:'PUBLIC_APP'});
 if(!pkg.evidence.some(e=>e.id===originalId))pkg.evidence.push({id:originalId,type:'OTHER',title:'Original ACD retained locally · SHA-256 '+evidence.acd.sha256,pathOrUrl:'local-source://'+evidence.acd.file,access:'LOCAL_ONLY'});
 const entries:RegisterEntry[]=climaxComponents.map(([key,label,type])=>{
  const cid=id+'-'+key;
  if(!pkg.components.some(c=>c.id===cid))pkg.components.push({id:cid,label,type,parentId:id,verificationStatus:'INFERRED',evidenceIds:[sourceId]});
  const asset=pkg.assets.find(a=>a.id===id)!;if(!asset.componentIds.includes(cid))asset.componentIds.push(cid);
  const rid=cid+'-evidence-'+evidence.acd.sha256.slice(0,12);
  if(!pkg.relationships.some(r=>r.id===rid))pkg.relationships.push({id:rid,source:cid,target:sourceId,type:'SUPPORTED_BY_EVIDENCE',verificationStatus:'INFERRED',evidenceIds:[sourceId],sourceReference:REVISION,note:'Saved-project association only; not physical wiring. Source review contains hashes, extraction records and limits.'});
  return {id:cid+'-control-'+REVISION,label,entityIds:[id,cid],evidenceIds:[sourceId],verificationStatus:'INFERRED',values:{relationshipKind:'inferred association',sourceFile:evidence.acd.file,sha256:evidence.acd.sha256,method:'Preliminary binary recovery; independently checked QuickInfo.XML',logicRevision:REVISION,physicalConnection:'Not established',controlDependencies:key==='plc'?['MCR_Delay.DN','Cycle_Start','Step','Step_1','Step_2']:key==='servo'?['Vertical_Axis','Horizontal_Axis','System_Auto_Home']:key==='pneumatics'?['Air_Pressure_OK_PS1','Vertical_Axis_Rod_Lock_Released_PRS15']:key==='bottle-conveyor'?['Bottle_Conv_Run','Bottles_Ready_for_Pickup']:key==='case-conveyor'?['Case_Conv_Run','Cases_Clear_at_Pack_Station']:[],validation:'Native export, installed-project match and machine-side confirmation required; I/O channels and physical wiring not established'},provenance:{filename:evidence.acd.file,section:'Source review and selected extraction records',review:'INHERITED',sourceId,locator:'docs/machines/LIEB-L2-CLIMAX-6759/source-review.md'}};
 });
 if(!pkg.documents.some(d=>d.id===docId))pkg.documents.push({id:docId,assetId:id,category:'Controls',title:'Climax source-backed control associations — draft',path:'docs/machines/LIEB-L2-CLIMAX-6759/source-review.md',state:'DRAFT',required:true,verificationStatus:'INFERRED',evidenceIds:[originalId],register:{kind:'Saved control logic associations (not wiring)',entries}});
 if(!pkg.documents.some(d=>d.id===docId+'-review'))pkg.documents.push({id:docId+'-review',assetId:id,category:'Troubleshooting',title:'Climax troubleshooting source review and validation needs',path:'docs/machines/LIEB-L2-CLIMAX-6759/source-review.md',state:'DRAFT',required:true,verificationStatus:'INFERRED',evidenceIds:[sourceId]});
 return withClimaxImages(pkg, id);
}
