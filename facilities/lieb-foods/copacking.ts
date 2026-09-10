import { emptyClaim, emptyCopacking, type Claim, type Copacking, type ProcessStage } from '../../src/facility/copacking';

const source = 'User-supplied revised J. Lieb Foods production-line and co-packing narrative; docs/FACILITY_COPACKING_SPECS.md';
const reported = (value: string): Claim => ({ ...emptyClaim(), value, status: 'USER_REPORTED', source });
export function liebCopacking(): Copacking {
  const c = emptyCopacking();
  c.lineClaims = {
    'line-1': emptyClaim(),
    'line-2': reported('Glass only; one reported heating / pasteurization / hold tunnel; exact function and compatibility require confirmation. Manual pallet stacking and standalone wrapping; wrapper identity and stretch-versus-shrink method unresolved.'),
    'line-4': reported('Primarily plastic (PET/HDPE), secondary glass capability; confirm by equipment and format. One reported cooling tunnel, automated palletizing and inline stretch wrapping; machine identities and routing unresolved.'),
  };
  for (const line of [2,4]) {
    const add = (name: string, flow: ProcessStage['flow'], optional = false, alternative = '', candidates: string[] = []) => {
      c.stages.push({ id: `copack-l${line}-${c.stages.filter(s => s.lineId === `line-${line}`).length + 1}`, facilityId: 'facility-j-lieb', name, lineId: `line-${line}`, flow, order: c.stages.filter(s => s.lineId === `line-${line}` && s.flow === flow).length, optional, alternative, assetId: null, candidates, claim: reported('Reported process stage; exact order, allocation and equipment count require field confirmation.'), assignment: { ...emptyClaim(), conflicts: 'Per-line equipment and shared upstream/end-of-line resources are both reported; ownership and routing remain unresolved.' } });
    };
    for (const name of ['Bulk depalletizing','Container elevator / lowering','Inverting air rinser','Filling','Capping']) add(name,'CONTAINER');
    add(line === 2 ? 'Heating / pasteurization / hold tunnel' : 'Cooling tunnel','CONTAINER',false,'Exact function, identity and location in sequence require confirmation.',[line === 2 ? 'EQP-TUNNEL-HEAT-01' : 'EQP-TUNNEL-COOL-01']);
    for (const name of ['Air knives / drying','Accumulation table','Bottle coding']) add(name,'CONTAINER');
    add('Labeling','CONTAINER',true,'Alternative to full-body shrink sleeving; route requires confirmation.',['LIEB-KOSME-TOPIIAD-L05358 (line assignment unconfirmed)']);
    add('Full-body shrink sleeving','CONTAINER',true,'Alternative to labeling; applicable formats unresolved.');
    add(line === 4 ? 'Drop / case packing' : 'Case packing','CONTAINER');
    add('Case closing','CONTAINER'); add('Case shrink wrapping','CONTAINER',true,'Where applicable; confirm route.');
    add('Box forming','CASE_SUPPORT',false,'Supplies cases to case packing; outside the bottle path.',line === 4 ? ['FG-L4-MTN-001 (existing Meta case former; exact routing requires confirmation)'] : []); add('Box coding','CASE_SUPPORT',false,'Supports case handling; exact order unresolved.');
    add(line === 2 ? 'Manual hand stacking' : 'Automated palletizing','PALLET',false,line === 2 ? 'Manual handling; does not establish a validated inspection procedure.' : 'Mechanism and routing unconfirmed.',line === 4 ? ['EQP-PALLETIZER-AUTO-01'] : []);
    add(line === 2 ? 'Standalone pallet wrapping' : 'Inline pallet stretch wrapping','PALLET',false,'Identity, shared allocation and actual routing need field evidence.',['LIEB-WULFTEC-A6882 (candidate only; line and inline applicability unconfirmed)']);
  }
  return c;
}
