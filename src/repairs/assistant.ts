import type {FacilityPackage} from '../facility/types';
import {documentSource} from '../lib/documentCatalog';
import {supabase} from '../facility/supabaseAuth';
import {repairInterpretation,type RepairInput} from '../../supabase/functions/_shared/repairAssistant';
import type {WorkRecord} from './model';

export function repairSources(pkg:FacilityPackage,work:WorkRecord):RepairInput {
 const asset=pkg.assets.find(a=>a.id===work.assetId);
 const note=[work.note,...work.entries.map(e=>e.kind+': '+e.text)].filter(Boolean).join('\n').slice(0,24000);
 const words=note.toLowerCase().split(/\W+/).filter(w=>w.length>3);
 const docs=pkg.documents.filter(d=>d.assetId===work.assetId).map(d=>({d,text:documentSource(d.path)??'',score:words.reduce((n,w)=>n+((d.title+' '+d.category).toLowerCase().includes(w)?1:0),0)})).sort((a,b)=>b.score-a.score).slice(0,6);
 return {note,sources:[...(asset?[{id:asset.id,title:asset.name,text:JSON.stringify({description:asset.description,facts:asset.facts,unknowns:asset.unknowns,verification:asset.verificationStatus,service:asset.production?.service}).slice(0,12000)}]:[]),...docs.map(({d,text})=>({id:d.id,title:d.title,text:('Record status: '+d.verificationStatus+'\n'+text).slice(0,12000)}))]};
}
export async function askRepairAssistant(pkg:FacilityPackage,work:WorkRecord) {
 if(!supabase)throw new Error('Connected Genie is unavailable. Your work remains saved.');
 const input=repairSources(pkg,work);
 const {data,error}=await supabase.functions.invoke('repair-assistant',{body:input});
 if(error||data?.error)throw new Error(data?.error??'Genie could not interpret this material. Your notes and files are still saved; submit them for review.');
 return {...repairInterpretation(data,input),generatedAt:new Date().toISOString(),inputVersion:work.version,sources:input.sources.map(({id,title})=>({id,title}))};
}
