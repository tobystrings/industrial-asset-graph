import type { MapEditorDraft, MapObjectRef } from './mapEditor';
import { allObjects, objectLabel, type StudioAction } from './studioModel';

const normalize=(s:string)=>s.toLowerCase().replace(/[“”"']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function resolveTarget(text:string,d:MapEditorDraft,selection:MapObjectRef[]):MapObjectRef[] {
  const name=normalize(text.replace(/^(the)\s+/i,''));
  if(/^(this|these|selected|selection|it|them)(\s+(room|area|wall|door|stairs|symbol|objects?|machines?))?$/.test(name)) {
    if(!selection.length) throw new Error('Select the object on the map first, then preview again.');
    return selection;
  }
  const matches=allObjects(d).filter(r=> normalize(objectLabel(d,r))===name||normalize(r.id)===name || (r.kind==='area' && normalize(d.areas.find(a=>a.id===r.id)!.shortName)===name));
  if(matches.length!==1) throw new Error(matches.length ? `More than one object is named “${text}”. Select the intended object and use “this”.` : `I could not identify “${text}”. Select it on the map and use “this”, or use its exact name.`);
  return matches;
}
/** Complete, anchored commands only. Unrecognized clauses never silently apply a partial instruction. */
export function parseCommands(input:string,d:MapEditorDraft,selection:MapObjectRef[]):StudioAction[] {
  const clauses=input.trim().replace(/[.!]+$/,'').split(/\s*;\s*|\n+/).filter(Boolean);
  if(!clauses.length) throw new Error('Describe an edit first.');
  const actions:StudioAction[]=[];
  for(const raw of clauses) {
    const text=raw.replace(/^please\s+/i,'').trim(); let m:RegExpMatchArray|null;
    if((m=text.match(/^(?:rename|name|call)\s+(.+?)\s+(?:to|as)\s+(.+)$/i))) actions.push({op:'rename',targets:resolveTarget(m[1],d,selection),name:m[2].replace(/^["“]|["”]$/g,'').trim()});
    else if((m=text.match(/^(?:move|nudge)\s+(.+?)\s+(left|right|up|down)(?:\s+(\d+(?:\.\d+)?)\s*(?:%|units?|grid units?)?)?$/i)) || (m=text.match(/^(?:move|nudge)\s+(.+?)\s+(\d+(?:\.\d+)?)\s*(?:%|units?|grid units?)?\s+(left|right|up|down)$/i))) {
      const dir=/^(left|right|up|down)$/i.test(m[2])?m[2].toLowerCase():m[3].toLowerCase();
      const amount=Number(/^(left|right|up|down)$/i.test(m[2])?m[3]??1:m[2]);
      actions.push({op:'move',targets:resolveTarget(m[1],d,selection),dx:dir==='left'?-amount:dir==='right'?amount:0,dy:dir==='up'?-amount:dir==='down'?amount:0});
    }
    else if((m=text.match(/^(?:rotate|turn)\s+(.+?)\s+(-?\d+(?:\.\d+)?)\s*(?:degrees?|°)?$/i))) actions.push({op:'rotate',targets:resolveTarget(m[1],d,selection),angle:Number(m[2])});
    else if((m=text.match(/^(flip|duplicate|delete|remove)\s+(.+)$/i))) actions.push({op:m[1].toLowerCase()==='remove'?'delete':m[1].toLowerCase() as 'flip'|'duplicate'|'delete',targets:resolveTarget(m[2],d,selection)});
    else if((m=text.match(/^resize\s+(.+?)\s+to\s+(\d+(?:\.\d+)?)\s*(?:%|units?)?\s*(?:by|x|×)\s*(\d+(?:\.\d+)?)\s*(?:%|units?)?$/i))) actions.push({op:'resize',targets:resolveTarget(m[1],d,selection),width:Number(m[2]),height:Number(m[3])});
    else if((m=text.match(/^(?:merge|combine)\s+(.+?)\s+(?:into|as)\s+(.+)$/i))) {
      const refs=/^(these|selected|these rooms|selected rooms)$/i.test(m[1])?selection:m[1].split(/\s+and\s+/i).flatMap(t=>resolveTarget(t,d,selection));
      actions.push({op:'merge',targets:refs,name:m[2].replace(/^["“]|["”]$/g,'')});
    }
    else throw new Error('That request needs connected AI or a more specific command. Try “rename this to Main Cooler”, “move this left 2”, “flip this”, or “merge these rooms into Main Cooler”. Separate edits with semicolons.');
  }
  return actions;
}
