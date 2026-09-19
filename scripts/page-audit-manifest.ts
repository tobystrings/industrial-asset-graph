import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pages,parentSearch} from '../src/navigation/pages';
const output='artifacts/page-audit';mkdirSync(output,{recursive:true});
const plant=JSON.parse(readFileSync('public/facility-state/facility-j-lieb/current.json','utf8')).payload.plant;
const asset='L2-CC-001';
const climax=plant.assets.find((a:any)=>/climax/i.test(a.name))?.id;
const component=plant.components.find((c:any)=>c.parentId===asset)?.id;
const doc=plant.documents.find((d:any)=>d.assetId===asset)?.id;
const manager=['review','assetAdd','manage','connection','evidence','observation','setup','database','settings','conflicts','health','import'];
const files:Record<string,string[]>={
  home:['src/navigation/AppShell.tsx'],more:['src/navigation/AppShell.tsx','src/navigation/toolGroups.ts'],
  machine:['src/machines/MachinePages.tsx'],assets:['src/machines/MachinePages.tsx','src/AssetDirectory.tsx'],
  repairs:['src/repairs/RepairPages.tsx'],repair:['src/repairs/RepairPages.tsx'],repairSummary:['src/repairs/RepairPages.tsx'],
  inbox:['src/repairs/ReviewPages.tsx'],submission:['src/repairs/ReviewPages.tsx'],admin:['src/repairs/ReviewPages.tsx'],requests:['src/repairs/ReviewPages.tsx'],
  inventory:['src/inventory/InventoryWorkspace.tsx'],history:['src/history/HistoricalWorkspace.tsx'],
  lines:['src/production/ProductionWorkspace.tsx'],documentation:['src/production/ProductionWorkspace.tsx'],maintenance:['src/production/ProductionWorkspace.tsx'],dependencies:['src/production/ProductionWorkspace.tsx'],
  map:['src/map/DetailedBuildingLayout.tsx','src/map/MapStudioPanel.tsx'],asset:['src/dashboard/SelectedAssetPanel.tsx','src/Dashboard.tsx'],area:['src/Dashboard.tsx'],
  documents:['src/dashboard/DocumentsWorkspace.tsx'],cabinet:['src/ControlCabinetView.tsx','src/equipmentImages/EquipmentImageWorkspace.tsx'],wulftec:['src/machines/WulftecWorkspace.tsx'],component:['src/machines/ComponentRecordPage.tsx'],
  field:['src/dashboard/FieldDocumentationWorkspace.tsx'],relationships:['src/Dashboard.tsx'],account:['src/auth/AccountSecurity.tsx'],help:['src/features/facility-guide/FacilityGuide.tsx','src/App.tsx'],
};
for(const id of manager)files[id]=['src/editor/PlantManager.tsx'];
const purpose:Record<string,string>={home:'Choose a main task or search equipment, parts and documents.',machine:'Choose information or work for one machine.',admin:'Open submissions, requested app changes and administration tools.',more:'Choose among everyday, record-review, administration and advanced tools.',repair:'Capture notes, files and observations; resume work and prepare a summary.',submission:'Read the immutable original, exchange clarification, propose, approve and apply reviewed changes.'};
const rows:any[]=[];
function add(page:string,details:Record<string,string>={},label?:string){
  const query=new URLSearchParams({page,...details}).toString();
  rows.push({id:'screen-'+rows.length,page,title:label??pages[page as keyof typeof pages][0],purpose:purpose[page]??pages[page as keyof typeof pages][1],query,parent:parentSearch('?'+query),files:files[page]??[],kind:'route'});
}
for(const id of Object.keys(pages)){
 const details:Record<string,string>={};
 if(['machine','asset','maintenance','repair','repairSummary','evidence','manage'].includes(id))details.asset=asset;
 if(id==='area')details.area='area-warehouse-e';
 if(id==='component'){details.asset=asset;details.component=component;}
 add(id,details);
}
for(const section of ['overview','troubleshooting','history','electrical','controls','parts','manuals','photos'])add('machine',{asset,section},'Machine / '+section);
if(doc)add('machine',{asset,section:'manuals',doc},'Machine / selected manual');
if(climax){add('machine',{asset:climax,section:'troubleshooting'},'Climax / guided troubleshooting');add('cabinet',{asset:climax},'Climax / cabinet photos');}
for(const section of ['Parts','Add Part','Find for Machine','Locations','Low Stock','Activity','Advanced'])add('inventory',{section,...(section==='Find for Machine'?{asset}:{})},'Inventory / '+section);
for(const tools of ['records','admin','advanced'])add('more',{tools},'More / '+tools);
for(const tab of ['record','intel','docs','capture'])add('asset',{asset,tab},'Asset / '+tab);
add('assets',{section:'devices'},'Equipment / devices and areas');
add('map',{edit:'1'},'Map / editor');
add('documents',{docState:'DRAFT'},'Documents / Draft filter');
if(doc)add('documents',{asset,doc},'Documents / selected document');
for(const [title,path] of [['Project tour','presentation/'],['Standalone machine viewer','wulftec/index.html'],['Evidence archive','assets/evidence/index.html'],['Recovered plant sources','facility-content/lieb-foods/browse.html']])rows.push({id:'screen-'+rows.length,page:'external',title,purpose:'Standalone public content; separate from the app navigation shell.',path,kind:'standalone',files:[]});
writeFileSync(output+'/manifest.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseline:execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim(),createdAt:new Date().toISOString(),scope:'Local draft build with isolated authentication/service fixtures. Published snapshot supplies route IDs; fixture data supplies rendered records. Production transactions are not exercised.',pages:Object.keys(pages).length,screens:rows},null,2));
console.log(`${Object.keys(pages).length} page IDs; ${rows.length} screen states`);
