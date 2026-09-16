import type { FacilityPackage } from '../../src/facility/types';
import type { EquipmentImageView } from '../../src/equipmentImages/model';

export const CLIMAX_CABINET = 'LIEB-L2-CLIMAX-6759-CABINET';
// Locations are visual observations, not installed designations or verified wiring.
const devices = [
  ['upper-left','Upper left drive','VFD',.37,.30,.046,.096,.363,.251,.047,.113],
  ['upper-right','Upper right drive','VFD',.452,.299,.038,.095,.436,.249,.047,.112],
  ['middle-left','Middle left drive','VFD',.483,.462,.035,.09,.455,.411,.047,.121],
  ['middle-center','Middle center drive','VFD',.53,.463,.038,.09,.51,.411,.047,.121],
  ['middle-right','Middle right drive','VFD',.579,.463,.038,.09,.566,.411,.047,.121],
  ['motion-left','Left motion unit — identity unconfirmed','DRIVE',.32,.466,.027,.177,.334,.412,.026,.175],
  ['motion-right','Right motion unit — identity unconfirmed','DRIVE',.347,.466,.027,.177,.363,.412,.026,.175],
  ['fuses','Upper fuse bank','FUSE_BANK',.507,.343,.111,.051,.493,.269,.124,.063],
  ['disconnect','Main disconnect mechanism','DISCONNECT',.642,.31,.125,.094,.632,.25,.075,.094],
  ['transformer','Transformer — label confirmation needed','TRANSFORMER',.645,.461,.06,.073,.631,.44,.052,.066],
  ['controller-io','Controller / I/O row — individual slots unconfirmed','CONTROLLER',.418,.578,.177,.08,.417,.554,.17,.09],
] as const;

/** Add only missing visual records. Keep prior reviewed identities and view geometry. */
export function withClimaxImages(pkg: FacilityPackage, machineId: string): FacilityPackage {
  const machine = pkg.assets.find(a => a.id === machineId);
  if (!machine) return pkg;
  const prior = pkg.featureConfig.imageViews?.find(v => v.machineId === machineId);
  const cabinetId = prior?.assetId ?? pkg.assets.find(a => /cabinet/i.test(a.type) && /climax/i.test(a.name))?.id ?? CLIMAX_CABINET;
  const source = 'climax-photo-interior';
  let cabinet = pkg.assets.find(a => a.id === cabinetId);
  if (!cabinet) {
    const unknown = {value:null,verificationStatus:'FIELD_VERIFY' as const,evidenceIds:[source]};
    cabinet = {id:cabinetId,name:'Climax Pick N Pack — control cabinet',description:'Separate control cabinet serving the Climax machine. Reported separation approximately 30 feet; exact placement and conduit route unverified.',type:'CONTROL_CABINET',facilityId:pkg.facility.id,areaId:machine.areaId,line:machine.line,verificationStatus:'FIELD_VERIFY',manufacturer:{...unknown,value:'Climax'},model:unknown,serialNumber:unknown,facts:[],componentIds:[],unknowns:['Exact map placement not surveyed.','Visible device designations, upstream supplies and downstream loads need confirmation.','Photo positions do not establish wiring or match saved PLC associations.']};
    pkg.assets.push(cabinet);
  }
  const area = pkg.areas.find(a => a.id === cabinet.areaId);
  if (area && !area.assetIds.includes(cabinetId)) area.assetIds.push(cabinetId);
  for (const [name,file,type] of [['interior','interior.jpg','PHOTO'],['exterior','exterior.jpg','PHOTO'],['interior-sketch','interior-sketch.jpg','DRAWING'],['exterior-sketch','exterior-sketch.jpg','DRAWING']] as const) {
    const id = 'climax-photo-'+name;
    if (!pkg.evidence.some(e => e.id === id)) pkg.evidence.push({id,type,title:'Climax cabinet '+name.replaceAll('-',' ')+' · supplied reference',pathOrUrl:'assets/climax/'+file,access:'PUBLIC_APP'});
  }
  for (const [key,label,type] of devices) {
    const id = cabinetId+'-'+key;
    if (!pkg.components.some(c => c.id === id)) pkg.components.push({id,label,type,parentId:cabinetId,verificationStatus:'FIELD_VERIFY',evidenceIds:[source]});
    if (!cabinet.componentIds.includes(id)) cabinet.componentIds.push(id);
    const relationId = cabinetId+'-contains-'+key;
    if (!pkg.relationships.some(r => r.id === relationId)) pkg.relationships.push({id:relationId,source:cabinetId,target:id,type:'CONTAINS',verificationStatus:'FIELD_VERIFY',evidenceIds:[source],note:'Photo-based position only; device designation not confirmed.'});
  }
  const regions = (sketch: boolean) => devices.map(d => ({entityId:cabinetId+'-'+d[0],x:d[sketch?7:3],y:d[sketch?8:4],width:d[sketch?9:5],height:d[sketch?10:6]}));
  const views: EquipmentImageView[] = [
    {id:'climax-exterior',assetId:cabinetId,machineId,label:'Cabinet exterior',evidenceId:'climax-photo-exterior',width:2880,height:3840,regions:[{entityId:cabinetId,x:.17,y:.24,width:.65,height:.38}]},
    {id:'climax-interior',assetId:cabinetId,machineId,label:'Inside cabinet',evidenceId:source,width:1280,height:960,regions:regions(false)},
    {id:'climax-interior-sketch',assetId:cabinetId,machineId,label:'Interior sketch',evidenceId:'climax-photo-interior-sketch',width:1280,height:853,regions:regions(true)},
    {id:'climax-exterior-sketch',assetId:cabinetId,machineId,label:'Exterior sketch',evidenceId:'climax-photo-exterior-sketch',width:1215,height:1280,regions:[{entityId:cabinetId,x:.21,y:.254,width:.48,height:.43}]},
  ];
  pkg.featureConfig.imageViews ??= [];
  for (const view of views) if (!pkg.featureConfig.imageViews.some(v => v.id === view.id)) pkg.featureConfig.imageViews.push(view);
  return pkg;
}
