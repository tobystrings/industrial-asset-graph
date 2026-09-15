import evidence from './evidence.json';
export { evidence };
export const ASSET_ID = 'LIEB-L2-CLIMAX-6759';
export const REVISION = evidence.revision;
export const DRAFT = 'Draft—requires machine-side validation';
export type Answer = 'yes' | 'no' | 'unknown';
export interface Check { id:string; title:string; observe:string; normal:string; component:string; records:number[]; yes:string; no:string; unknown:string }
const check=(id:string,title:string,observe:string,normal:string,component:string,records:number[]):Check=>({id,title,observe,normal,component,records,yes:'Record the observation and continue. This alone does not confirm restart readiness.',no:'Record the abnormal condition. It is a suspected contributor, not a confirmed root cause. Stop this path and request maintenance review.',unknown:'Do not guess or enter the guarded area. Record what is missing and request qualified maintenance verification.'});
export const checks:Record<string,Check>={
 safety:check('safety','Can these observations be made from a normal operating position with guards closed?','Observe only from outside the guarded area. If a person is exposed, use the applicable site emergency procedure. Do not enter or remove guarding.','No entry, guard removal, electrical access or stored-energy exposure is needed.','machine',[72,85,86,87,88]),
 master:check('master','Is the indicated master-control / safety status normal?','Record the exact indication available at the normal operating station. Display labels and locations have not been verified. If no indication is available, choose Not sure.','A site-verified normal indication; a PLC bit alone does not establish the safety circuit condition.','plc',[84,85,86,87,88,253]),
 air:check('air','Is the indicated air-pressure status normal?','Read an existing indication from the normal operating position only. Record the value and units if shown; no setpoint is established here.','Within the site-approved range, if that range is known. Otherwise choose Not sure.','pneumatics',[1,103,244,253]),
 mode:check('mode','Are the displayed mode and recipe the intended ones?','Record the exact mode and recipe. Do not change mode to bypass a failed condition.','The intended mode and recipe are confirmed against the approved job setup.','plc',[60,253]),
 bottle:check('bottle','Is bottle accumulation behaving as expected?','Observe visible bottle flow from outside guards and record the last successful pickup. Do not reach into the mechanism.','Bottles accumulate as expected for the verified job setup; an issued run command alone is insufficient.','bottle-conveyor',[1,33,253]),
 case:check('case','Are cases present and indexing as expected?','Observe visible case flow and exact displayed status. Sensor locations and indicator meanings need machine-side verification.','Cases arrive and index according to the approved job setup.','case-conveyor',[29,30,33,60]),
 grip:check('grip','Is the held-product condition known?','Record whether bottles are held, dropped, partly gripped, or unknown. Record visible gripper, basket and clamp conditions without entering.','Load and mechanisms are in a known condition confirmed by an authorized person.','pneumatics',[60,103,253]),
 drive:check('drive','Is the displayed drive / axis fault status clear?','Copy the exact fault code and text before any reset. Access only an existing normal-position display.','No indicated fault, confirmed by an applicable display; missing data is Not sure.','servo',[72,244,245]),
 reference:check('reference','Are axis position and reference known to be valid?','Record displayed positions and units, last successful movement, and any reset or power interruption. Do not infer position from a movement command.','An authorized person confirms position and reference under the applicable procedure. A homed bit alone is insufficient.','servo',[199,201,203,204,246]),
 interruption:check('interruption','Are the last successful step and interruption details known?','Record jam, changeover, maintenance, reset or power interruption, including time and what the last shift already tried.','The last completed movement and changes since it are documented.','plc',[204,253]),
 intermittent:check('intermittent','Is there a repeatable observation around the stop?','Record timestamps, exact messages, recipe and preceding movement for each stop. Do not reproduce a hazardous condition or repeatedly reset.','At least one time-linked observation is preserved for maintenance comparison.','plc',[72,253]),
};
export const symptoms=[
 {id:'nothing',label:'Nothing starts',path:['safety','master','air','mode','drive','reference']},
 {id:'bottle',label:'Bottle conveyor won’t run',path:['safety','master','air','mode','bottle','drive']},
 {id:'case',label:'Case conveyor won’t run / cases won’t index',path:['safety','master','air','mode','case','grip']},
 {id:'pickup',label:'Bottles are present but won’t pick up',path:['safety','air','mode','bottle','grip','reference']},
 {id:'transfer',label:'Bottles won’t transfer or release',path:['safety','grip','case','air','drive','reference']},
 {id:'axis',label:'Vertical or horizontal axis won’t move',path:['safety','grip','air','drive','reference']},
 {id:'home',label:'Axis won’t home',path:['safety','grip','air','drive','reference']},
 {id:'halfway',label:'Stops halfway through a cycle',path:['safety','grip','interruption','case','drive','reference']},
 {id:'intermittent',label:'Intermittent stops',path:['safety','intermittent','master','air','drive']},
 {id:'restart',label:'Won’t restart after jam, fault, reset or power interruption',path:['safety','interruption','grip','drive','reference','mode']},
];
export const intakeFields={role:'Your task role (does not change account permissions)',fault:'Exact HMI message / fault code',mode:'Current mode',recipe:'Current recipe',lastStep:'Last successful movement / sequence step',change:'Recent changeover, jam, maintenance, reset or power interruption'};
export const recoveryFields={fault:'Exact fault and last completed sequence step',position:'Axis positions and confidence in reference',load:'Held bottles / other load',mechanisms:'Gripper, basket, clamp and case positions',air:'Air pressure and brake / rod-lock condition',drive:'Drive status',clearance:'Travel-path clearance, confirmed physically',personnel:'Personnel / guarding condition',procedure:'Applicable approved procedure and revision'};
export const restartFields={personnel:'Personnel clear and guarding restored',load:'Load and mechanisms in verified condition',reference:'Position and reference valid',mode:'Correct mode and recipe',fault:'Fault and interlock status checked',sequence:'Sequence ready under approved restart procedure',operation:'Operation restored and independently observed'};
export const recoveryKinds={reset:'Fault reset',home:'Automatic homing',jog:'Powered manual jogging',isolation:'Physical repositioning under isolation',power:'Power cycling'};
export const recoveryExplanations={
 reset:'Resetting a fault is separate from restoring position reference or resetting sequence state. Preserve diagnostic evidence; repeated resets are not a recovery plan.',
 home:'Returning to a position, establishing a reference through homing, and resetting sequence state are different operations. Recovered records suggest ordered homing, but safe movement order, directions and stopping points are unverified.',
 jog:'Powered jogging requires verified controls, limits, directions, speeds and stopping points. It is not an isolation/LOTO procedure. No executable jogging sequence is validated here.',
 isolation:'Physical repositioning requires the applicable site isolation and support/restraint procedure. Consider vertical gravity, held bottles and stored pneumatic energy; do not improvise restraints.',
 power:'Power cycling has not been established as the appropriate recovery. Preserve fault evidence. Equipment to cycle, discharge time, brake/load behavior, retained sequence state and restart effects require applicable manufacturer and site procedures.',
};
export function recoveryStatus(values:Record<string,string>){return Object.keys(recoveryFields).some(k=>!values[k]?.trim()||/^unknown$/i.test(values[k].trim()))?'More observations needed: complete these checks first.':'Recovery not validated for this condition: stop and escalate.';}
