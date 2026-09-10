import type { FacilityArea } from '../types/facility';

/** Wrap labels inside their room instead of painting over adjacent room names. */
export function AreaMapLabel({area,width,height}:{area:FacilityArea;width:number;height:number}) {
  const box=area.overlay;
  const available=Math.max(30,box.width/100*width-12);
  const words=area.shortName.split(/\s+/).filter(Boolean);
  const longest=Math.max(1,...words.map(w=>w.length));
  const fontSize=Math.max(14,Math.min(22,available/(longest*.64)));
  const columns=Math.max(longest,Math.floor(available/(fontSize*.64)));
  const lines:string[]=[];
  for(const word of words) {
    const last=lines.length-1;
    if(last>=0 && lines[last].length+word.length+1<=columns) lines[last]+=' '+word;
    else lines.push(word);
  }
  const x=(box.x+box.width/2)/100*width;
  const y=(box.y+box.height/2)/100*height-(lines.length-1)*fontSize*.6;
  return <text x={x} y={y} style={{fontSize}}>{lines.map((line,i)=><tspan key={i} x={x} dy={i?fontSize*1.2:0}>{(i?' ':'')+line}</tspan>)}</text>;
}
