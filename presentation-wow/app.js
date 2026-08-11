const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const code=`// facility-knowledge.graph\nasset Warehouse_F { status: documented; }\nedge panel -> breaker -> disconnect -> cabinet;\nclaim voltage { state: FIELD_VERIFY; source: nameplate; }\nrecord institutional_knowledge { owner: facility; retained: true; }\nworkflow walkdown -> capture -> review -> connect;\nquery start_with(machine).follow(relationships);\npolicy undocumented_assumption = forbidden;\nstatus knowledge_capture = active;\n`;
$('#codefield').textContent=code.repeat(14);
addEventListener('pointermove',e=>{$('#cursorGlow').style.left=e.clientX+'px';$('#cursorGlow').style.top=e.clientY+'px'});

const boot=$('#boot'), skip=$('#skipBoot'), canvas=$('#bootCanvas'), ctx=canvas.getContext('2d');
function resize(){canvas.width=innerWidth;canvas.height=innerHeight} resize();addEventListener('resize',resize);
let start=performance.now(),raf;
function bootFrame(t){const elapsed=t-start,cols=Math.ceil(canvas.width/54),rows=Math.ceil(canvas.height/54),p=Math.min(1,elapsed/2100);ctx.clearRect(0,0,canvas.width,canvas.height);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const px=(x+.5)*54,py=(y+.5)*54,d=Math.hypot(px-canvas.width/2,py-canvas.height*.46)/(Math.hypot(canvas.width,canvas.height)*.55),a=Math.max(0,1-Math.abs(d-p)*7);ctx.fillStyle=`rgba(${(x+y)%2?'94,230,192':'124,108,255'},${a*.55})`;ctx.fillRect(x*54+1,y*54+1,52,52)}if(elapsed<2300)raf=requestAnimationFrame(bootFrame);else finishBoot()}
function finishBoot(){cancelAnimationFrame(raf);boot.classList.add('done');document.body.classList.remove('is-booting');setTimeout(()=>boot.remove(),700)} skip.onclick=finishBoot;raf=requestAnimationFrame(bootFrame);

const commands={
  risk:['$ risk','45 years in the trade · 15 years at this facility','warning: undocumented context is approaching retirement'],
  map:['$ map','11 facility areas indexed','building layout is the navigation layer'],
  trace:['$ trace warehouse-f/line-2','area → machine → cabinet → controls → evidence','relationship path ready'],
  verify:['$ verify','verified · field-verify · inferred · disputed · retired','every claim carries a source and review state'],
  help:['$ help','risk · map · trace · verify','use ↓ / ↑ to navigate the presentation']
};
const output=$('#termOutput'), input=$('#termInput');
function run(cmd){const lines=commands[cmd.trim().toLowerCase()]||['$ '+cmd,'command not found — try help'];output.innerHTML='';lines.forEach((l,i)=>setTimeout(()=>{const p=document.createElement('p');p.textContent=l;if(i===lines.length-1)p.className='ok';output.appendChild(p)},i*180));input.value=''}
$$('[data-cmd]').forEach(b=>b.onclick=()=>run(b.dataset.cmd));$('#termSend').onclick=()=>run(input.value);input.addEventListener('keydown',e=>{if(e.key==='Enter')run(input.value)});

const scenes=$$('.scene'), reveals=$$('.reveal'), rails=$$('.rail a');
const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.classList.add('active');$$('.reveal',entry.target).forEach((el,i)=>setTimeout(()=>el.classList.add('in'),i*90));const idx=scenes.indexOf(entry.target);rails.forEach((r,i)=>r.classList.toggle('active',i===idx));$$('[data-count]',entry.target).forEach(el=>count(el,+el.dataset.count))}),{threshold:.42});scenes.forEach(s=>io.observe(s));
function count(el,to){if(el.dataset.done)return;el.dataset.done='1';const start=performance.now();function tick(t){const p=Math.min(1,(t-start)/1100);el.textContent=Math.round(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)}
function progress(){const h=document.documentElement.scrollHeight-innerHeight;$('#progress').style.transform=`scaleX(${h?scrollY/h:0})`}addEventListener('scroll',progress,{passive:true});progress();
$$('[data-tilt]').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(1200px) rotateX(${-y*2.8}deg) rotateY(${x*3.8}deg)`});el.addEventListener('pointerleave',()=>el.style.transform='')});
function go(delta){let idx=scenes.findIndex(s=>{const r=s.getBoundingClientRect();return r.top>-innerHeight*.45&&r.top<innerHeight*.55});idx=Math.max(0,Math.min(scenes.length-1,idx+delta));scenes[idx].scrollIntoView({behavior:'smooth'})}
addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();go(1)}if(['ArrowUp','PageUp'].includes(e.key)){e.preventDefault();go(-1)}if(e.key.toLowerCase()==='f')document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();if(e.key==='?')$('#help').showModal()});
$('#helpBtn').onclick=()=>$('#help').showModal();$('#helpClose').onclick=()=>$('#help').close();
