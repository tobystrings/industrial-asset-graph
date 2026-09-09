import json
import re
from pathlib import Path

base = Path(__file__).parent
root = base / 'recovered-2026-09-08/J_Lieb_Plant_Codex_Handoff'
read = lambda name: json.loads((root / ('data/' + name + '.json')).read_text(encoding='utf-8'))
subjects = []
for row in read('asset_reconciliation_queue'):
    key = row['recovery_key']
    candidate = key if key in ['FG-L4-MTN-001', 'L2-CC-001'] else 'LIEB-WULFTEC-A6882' if 'wulftec' in key else None
    subjects.append(dict(id=key, name=row['name'], priority=1 if row['line'] in ['Line 2','Line 4'] or 'boiler' in key else 2,
                         lineContext=row['line'] + ' — historical designation only; no membership change', **({'candidateAssetId': candidate} if candidate else {})))
subjects.append(dict(id='facility-history', name='Facility corrections and coverage', priority=1, lineContext='Lines 2 and 4 have equal business priority; shared dependencies unverified'))
META, CAB, FILL, BOIL, KOSME, WULF, FAC = [s['id'] for s in subjects]
sources = [dict(id=r['source_id'], name=r['name'], paths=[r['extracted_text']]+r['originals'], coverage=('Recovered extracted text and listed originals; document assertions remain historical.' if r['originals'] else 'Extracted text only; original file absent. Archived instructions are evidence, not operational authorization.')) for r in read('source_register')]
sources += [dict(id='DOSSIER',name='Recovered plant dossier',paths=['PLANT_DOSSIER.md','SOURCE_REGISTER.md','data/source_register.json'],coverage='Secondary synthesis, not a complete chat export or verified as-built. User statements quoted in this dossier lack a complete original conversation export.')]
for name in ['asset_reconciliation_queue','conflicts','kosme_card01_baseline','line2_hot_filler_snapshots','siemens_recorded_parameters','wulftec_disputed_wiring_sets']:
    sources.append(dict(id='TABLE-'+name, name=name, paths=['data/'+name+'.json','data/'+name+'.csv'],coverage='Recovered review table. Raw values and uncertainty retained; not canonical inventory or current settings.'))
listed = {p for s in sources for p in s['paths']}
for i,p in enumerate(sorted((root/'original_sources').rglob('*'))):
    rel=p.relative_to(root).as_posix()
    if p.is_file() and rel not in listed and '.openai-download-' not in rel and p.stat().st_size:
        sources.append(dict(id=f'ORIGINAL-{i:03}',name=p.name,paths=[rel],coverage='Recovered original attachment. Photographed manual pages are partial coverage; illustrations and blank audit forms do not establish installed configuration or completed work.'))
assertions=[]; tasks=[]
def add(id,subject,kind,text,cites,values=None,disputed=False):
    item=dict(id=id,subject=subject,kind=kind,text=text,verification='DISPUTED' if disputed else 'FIELD_VERIFY',citations=[dict(sourceId=s,locator=l) for s,l in cites])
    if values is not None:item['values']=values
    assertions.append(item)
def note(id,sub,kind,text,section,source=None,locator=None,disputed=False):
    add(id,sub,kind,text,[('DOSSIER',section)]+([(source,locator)] if source else []),disputed=disputed)

note('META-IDENTITY',META,'USER_OBSERVATION','Existing FG-L4-MTN-001: META 150 HS, Smurfit-Stone Packaging Systems; serial MT081619A requires final plate confirmation. Preserve existing identity and revision history.','2','S07','PDF page 3')
note('META-UTILITIES',META,'OEM_REQUIREMENT','Reported plate requirements: 480 VAC, 3-phase, 60 Hz; 34.2 A; recommended branch protection 40 A; 24 VDC; air 80 PSI / 30 SCFM. Requirements do not prove installed protection or measured consumption.','2','S07','PDF page 3')
note('META-CONTROLS',META,'USER_OBSERVATION','One PowerFlex 70 VFD1, three Control Techniques servos with unknown axes/models, Bosch Rexroth inline I/O and 24 V supply reported. Device functions, safety and feed trace remain open.','2','S07','PDF pages 3–4')
note('META-SEQUENCE',META,'PROPOSAL','Magazine → pick/open → fold → adhesive → press → discharge is a working sequence for field review. No PLC truth, vacuum specification or verified process connections established.','2','S07','PDF page 3 working sequence')
note('CAB-IDENTITY',CAB,'USER_OBSERVATION','User statement 2026-08-06T16:48:40Z identifies L2-CC-001 as Line 2 conveyor control cabinet. Reconcile to existing ID.','3','S12','Recovered source history, Line 2 cabinet')
note('CAB-ILLUSTRATION',CAB,'GENERATED_ILLUSTRATION','MicroLogix 1400 / 1762 modules, eight PowerFlex 4 symbols and cabinet parts in generated illustrations are candidates only. Do not assert installed counts or merge with the Wulftec SLC 5/03.','3','S12','Generated cabinet drawing history')
note('CAB-MILESTONE',CAB,'REPORTED_COMPLETION','Next 3 TODOs reports historical software work COMPLETE. It does not verify current software, deployment or physical cabinet documentation.','3','S13','Whole historical progress document')
note('FILL-TOPOLOGY',FILL,'PROPOSAL','Working hot-filler circuits and corrected three-sheet drawings are reconstructions, not a verified P&ID. Sensor tags measure pipes; they are not serial product-flow assets. No directed process relationships are imported.','4 / Working circuits and topology','S06','Whole raw working sequence',True)
note('FILL-CORRECTIONS',FILL,'CORRECTION','Reconstruction corrections: PT102 before heating HX; AV106 branch LT302/PMP103 → END PROCESS; CP301 before RTD105; remove duplicate TT101 on sheet 3; correct RTD310 symbol and AV107/108 branch geometry. These remain drawing review items.','4 / Working circuits and topology','S09','Corrections and sheet interfaces')
note('FILL-UNKNOWN-TAGS',FILL,'SECONDARY_SUMMARY','Preserve CP301, SRV101 and MVP101 literally; functions unknown. Repeated FP302 may be one device. No AV101, no invented four-filter installation, no expansion of BT1/BT2 without evidence.','4','S04','PDF pages 3–10',True)
note('FILL-TV101',FILL,'USER_OBSERVATION','Historical heat-delivery complaint: TV101 normally approximately 5–8%, spikes to 100% when too cold. Root cause unconfirmed. No completed repair established.','4 / TV101 heat-delivery issue','S12','Recovered hot filler troubleshooting history')
note('FILL-IP',FILL,'USER_OBSERVATION','Fairchild TT6000-401 reported label: 4–20 mA input, 3–15 PSIG output, 20–120 PSIG supply. Actual connection to TV101 not traced.','4 / TV101 heat-delivery issue')
note('FILL-DIAGNOSTIC',FILL,'PROPOSAL','HMI PID → unknown PLC analog output → I/P → actuator → steam valve → HX/condensate → circulation → product temperature is a diagnostic hypothesis, not confirmed topology or an instruction to operate equipment.','4 / TV101 heat-delivery issue')
note('BOILER-IDENTITY',BOIL,'USER_OBSERVATION','2026-07-24 user statements: Superior Boiler Works X6-5-1250; tag 5991552, 350 boiler HP, 250 psi rated, fire-tube. Tag is not established serial; rated pressure is not operating pressure.','5 / Original boiler nameplate conversation')
note('BOILER-ELECTRICAL',BOIL,'USER_OBSERVATION','Flame controls reported 120 V single-phase 4.3 A; blower 460 V three-phase 20 motor HP 23 A. Historical assistant estimate 34.37 A is not a feeder design input.','5 / Original boiler nameplate conversation')
note('BOILER-WATER',BOIL,'HISTORICAL_SNAPSHOT','Water totals: 6,165,009 gal on July 23 → 6,253,811.7 gal August 12, 2026; delta 88,802.7 gal, reported 4,440.14 gal/day. Meter location/type unverified. These are water readings, not measured steam; old 25,900 lb/day estimate is not measured steam.','5 / Aqua Analytics report','S03','PDF page 1',True)
note('BOILER-CHEMISTRY',BOIL,'HISTORICAL_SNAPSHOT','Secondary August 12 service values: feedwater 150 F; conductivity 1335 µmhos; boiler conductivity 4547 µmhos; chloride 100 ppm; sulfite 36 with unit unconfirmed. Original Aqua Analytics service report absent.','5 / Aqua Analytics report','S03','PDF pages 1 and 5')
note('BOILER-TARGETS',BOIL,'PROPOSAL','Historical provider targets: feedwater 180 F; boiler conductivity 2500–3500; chloride 30–65; sulfite 60–80 (unit unresolved). More blowdown/longer rinse were recommendations, not confirmed completed work or current instructions.','5 / Aqua Analytics report','S03','PDF pages 1 and 5')
note('BOILER-SERVICE',BOIL,'REPORTED_COMPLETION','August 12 secondary service report says C41 timer reduced 12 → 6 seconds and unprimed pumps re-primed. No proof of present settings; GWT-16 usage unknown. Audit logs are blank, not completed tests.','5 / Aqua Analytics report','S03','PDF pages 1 and 5')
note('KOSME-IDENTITY',KOSME,'OEM_REQUIREMENT','OEM identity: KOSME S.r.l. Unipersonale, TOP II AD TANDEM 20/1056 CE SA4 E2; registration L05358, manual K966-749, literal revision REV. 01-06. Do not infer a revision date or plant line.','6 / Identity and OEM requirements','S16','Cover and OEM page 5')
note('KOSME-UTILITIES',KOSME,'OEM_REQUIREMENT','OEM page 5: 18,000 pieces/hour; 400 V 3×400 N-PE 60 Hz, 6.5 kW; 24 VAC auxiliaries; air 15 Nl/min at 6–7 bar. CR30 electronics use 24 VDC separately. No installed plant feed or transformer inferred.','6 / Identity and OEM requirements','S16','OEM page 5')
note('KOSME-CONFIGURATION',KOSME,'OEM_REQUIREMENT','20 plates; 5–50 C, 30–90% RH, 68 dBA/70 dBC are OEM specifications. Meaning of 1056 / SA4 / E2 expansions not established. SMC 2062455 is index-only; optional devices remain unverified installations.','6 / Identity and OEM requirements','S10','Identity and installed-versus-generic guardrail')
note('KOSME-ALIASES',KOSME,'SECONDARY_SUMMARY','L05358 versus older EG05245 / 05358 unresolved; handwritten K5001696 uncertain. Sensicol maintenance cover 05/04/2015 Rev 00 relationship to this manual unresolved.','6 / Identity and OEM requirements','S16','Identity uncertainty notes',True)
note('KOSME-OEM-PATH',KOSME,'OEM_REQUIREMENT','OEM internal sequence: feedscrew A → infeed star B → turntable C → label D → rollers E → exit star F → conveyor G. This is machine-manual topology, not verified plant process connections.','6 / Process and controls','S05','OEM page 57')
note('KOSME-CONTROLS',KOSME,'OEM_REQUIREMENT','CR27 synchronizer and CR30 display are distinct. CR30 versus KET39 index naming remains a document discrepancy. Manual terminal functions do not establish installed wires. Common R1 differs from per-platform Cp.','6 / Process and controls','S15','OEM pages 65–75')
note('KOSME-SERVICE',KOSME,'USER_OBSERVATION','Historical errors on cards 15 and 20 reportedly followed board swaps; exact before/after address mapping and fault text are missing. Error 27 communication diagnostics list possible causes; no failed-board root cause is established.','6 / Fault and service history','S14','OEM pages 76–80 and supplied history')
note('KOSME-COVERAGE',KOSME,'SECONDARY_SUMMARY','Actual manual coverage: cover, index 1–4, content pages 5–8 and 57–80 (58/64 blank). Missing content 1–4, 9–56, 81–135. Index pages do not mean content pages 1–4 were captured. Capture maintenance/lubrication 103–130 first.','6 / Manual completeness','S10','Manual coverage ledger')
note('WULF-IDENTITY',WULF,'SECONDARY_SUMMARY','WCRT/WRTC alias unresolved; A6882 / Golden State Vintners #6882 is a manual identifier, not proven serial. Candidate link LIEB-WULFTEC-A6882 only if that record exists. Plant line unknown.','7 / Identity and parts','S02','PDF summary pages 1–2',True)
note('WULF-SUPPLY',WULF,'USER_OBSERVATION','H2–D4–1P, circuits 14/16/18 is reported hierarchy with ambiguity. 480 V upstream and transformed 208Y/120 V are separate voltage domains. Do not connect 480 V directly to a 200–240 V drive in the graph.','7 / Identity and parts','S02','PDF page 2',True)
note('WULF-DRIVE',WULF,'USER_OBSERVATION','VFD7 second outfeed replacement reported PowerFlex 4 22A-B8P0N104 Series A: 2 HP, 200–240 V 3-phase, input 9.5 A, output 8 A continuous / 12 A 60s. Drive rating is not motor FLA. Reference Drive 6 Siemens 6SE3213-6CA40 750 W, 208/240 V, 3.90 A not proved VFD7.','7 / Identity and parts','S02','Nameplate and Drive 6 reference sections')
note('WULF-MOTORS',WULF,'USER_OBSERVATION','Sterling SH0014PCA 1 HP, 1750 rpm, 208/230/460 V: 208 V current disputed 3.0 vs 3.2 A; other values 2.9/1.45 A. Adjacent Baldor 1 HP 1725 rpm 3.2 A and separate 2 HP 230 V 6.2 A 1725 rpm load are distinct records.','7 / Motor records','S02','Motor nameplate records',True)
note('WULF-WIRING-OWNERSHIP',WULF,'SECONDARY_SUMMARY','Set A attributed to VFD7 in summary PDF pages 2/5, but PDF pages 12–15 identify Drive 6 reference and leave VFD7 worksheet blank. Preserve both assertions; never copy reference wires into canonical VFD7 terminals.','7 / Wiring Set A','S02','PDF page 12: blank VFD7 worksheet above Drive 6 reference',True)
note('WULF-MAPPING-PROPOSAL',WULF,'PROPOSAL','Suggested PowerFlex mapping wire 6→04, 129→02, 128→03, 188→R1, 187→R2 is a proposal. Final tests are blank and mapping is not installed wiring.','7 / Wiring Set A','S02','Proposed migration section',True)
note('WULF-LATER-SNAPSHOT',WULF,'HISTORICAL_SNAPSHOT','Later Siemens readback P021/P022 4/56 and P023=0 differs from parameter PDF 0/60. Device and chronology unresolved; preserve separate snapshots.','7 / Siemens recorded parameter set','S08','P021/P022 versus later dossier readback',True)
note('WULF-AB-SNAPSHOT',WULF,'HISTORICAL_SNAPSHOT','PowerFlex P031 reported 230 then 208 V; final export absent. Do not infer A088 changed or use P033=8 A as motor current.','7 / Allen-Bradley readbacks from supplied history','S02','Readback/proposal sections',True)
note('WULF-FAULT',WULF,'USER_OBSERVATION','Recurring F231, temporary reset recovery, PE10/relay chatter and VFD3/6/7 correlations reported. Fault with motor leads disconnected lacks test setup. SLC 5/03 output-module 2 output 4 relay report is not an exact validated PLC address. A6882.ACH filename is not a validated backup.','7 / Fault and commissioning timeline','S02','Fault history and PLC leads')
note('WULF-SERVICE',WULF,'REPORTED_COMPLETION','Replacement and conveyors running same direction/speed were reported. Current/voltage measurements, cycle testing, relay proving and signed commissioning remain missing. Drawing speed change 30→36 FPM on 2000-11-22 is not measured speed.','7 / Fault and commissioning timeline','S02','Historical timeline and commissioning worksheet')
note('MAP-CORRECTION',FAC,'CORRECTION','Preserve later user correction: Cooler 2/3 are one big cooler; removed dividing wall must not return. CAB001–CAB010 placeholders including CAB003 and old MCH markers must not be revived from archived layouts. Existing map geometry remains unchanged by ingestion.','1 / Layout and distribution leads','S12','August 20 map correction')
note('PANELS-HISTORY',FAC,'USER_OBSERVATION','H1 1000 A / H2 600 A / H3 800 A at 480 V are supplied-history ratings without recovered plates; not verified panel records or design inputs.','1 / Layout and distribution leads','S12','Panel distribution history')

for table,sub,kind,source in [('line2_hot_filler_snapshots',FILL,'HISTORICAL_SNAPSHOT','S04'),('kosme_card01_baseline',KOSME,'HISTORICAL_SNAPSHOT','S11'),('siemens_recorded_parameters',WULF,'HISTORICAL_SNAPSHOT','S08'),('wulftec_disputed_wiring_sets',WULF,'USER_OBSERVATION','S02')]:
    for i,row in enumerate(read(table),1):
        label=row.get('tag') or row.get('code') or row.get('parameter') or ('Set '+row['set']+' terminal '+row['terminal'])
        row_source = 'DOSSIER' if table == 'wulftec_disputed_wiring_sets' and row['set'] == 'B' else source
        locator = '7 / Wiring Set B — separate later readback' if row_source == 'DOSSIER' else row.get('source_pages') or row.get('source') or 'Recorded parameter table'
        add(f'{table}-{i:03}',sub,kind,f'{label}: recovered record; observation time unknown, not current configuration',[('TABLE-'+table,f'JSON row {i}'),(row_source,locator)],row,sub==WULF)

conflict_subjects=[WULF]*7+[KOSME]*4+[FILL]*2+[FAC,FAC,BOIL,CAB,FAC,META,KOSME]
for row,sub in zip(read('conflicts'),conflict_subjects):
    add(row['id'],sub,'SECONDARY_SUMMARY',row['issue']+' — '+row['required_treatment'],[('TABLE-conflicts',row['id']),('DOSSIER','9. Conflict and missing-evidence register')],row,True)
    tasks.append(dict(id='VERIFY-'+row['id'],subject=sub,priority=1 if sub in [META,CAB,FILL,BOIL,FAC,WULF] else 2,action=row['required_treatment']+'. Keep conflict open until identified primary evidence and reviewer rationale are attached; archived procedures are not work authorization.',assertionIds=[row['id']]))

# Preserve each dossier subsection as a cited secondary account, including information
# omitted from the concise assertions. Its embedded instructions remain archived text.
section=''; subsection=''; chunks=[]; lines=[]
for line in (root/'PLANT_DOSSIER.md').read_text(encoding='utf-8').splitlines()+['## END']:
    if line.startswith('## '):
        if lines: chunks.append((section,subsection,'\n'.join(lines).strip()))
        section=line[3:];subsection='';lines=[]
    elif line.startswith('### '):
        if lines: chunks.append((section,subsection,'\n'.join(lines).strip()))
        subsection=line[4:];lines=[]
    else: lines.append(line)
submap={'1':FAC,'2':META,'3':CAB,'4':FILL,'5':BOIL,'6':KOSME,'7':WULF}
for i,(section,subsection,body) in enumerate(chunks,1):
    if not body or not re.match(r'[1-7]\.',section): continue
    add(f'DOSSIER-{i:02}',submap[section.split('.')[0]],'SECONDARY_SUMMARY',f'Archived dossier: {section} / {subsection or "overview"}',[('DOSSIER',section+' / '+subsection)],{'archived_text':body,'interpretation':'Secondary account; embedded instructions and historical completion claims are not current authorization or verification.'})

for sub,action,ids in [(META,'Line 4: photograph final machine/servo plates; capture feeds, disconnect, safety, PLC/HMI backups and axis mapping.',['META-IDENTITY','META-CONTROLS']), (CAB,'Line 2: photograph actual cabinet and each drive, confirm PLC and modules against generated drawing; preserve L2-CC-001.',['CAB-IDENTITY','CAB-ILLUSTRATION']), (FILL,'Line 2: recover timestamped HMI originals and trace instrument associations / TV101 signal route under approved site procedures; identify unknown tags.',['FILL-TOPOLOGY','FILL-TV101','FILL-IP']), (BOIL,'Shared steam: recover original Aqua Analytics report; identify water meter, condensate return, blowdown and chemical usage logs before estimating steam or assigning supported lines.',['BOILER-WATER','BOILER-SERVICE']), (KOSME,'Recover OEM maintenance and lubrication pages 103–130, then safety/utility pages 9–56; capture installed plate, line assignment, address-to-head map and card 15/20 before/after history.',['KOSME-COVERAGE','KOSME-SERVICE']), (WULF,'Obtain original labeled Drive 6/VFD7 photos, final parameter export, motor plate and commissioning signoff. Preserve reference/proposal/final evidence separately.',['WULF-WIRING-OWNERSHIP','WULF-SERVICE']), (FAC,'Confirm actual dependencies supporting Lines 2 and 4 with source-backed field records; do not infer flow or line membership from asset names.',['MAP-CORRECTION'])]:
    tasks.append(dict(id=f'CAPTURE-{len(tasks)+1}',subject=sub,priority=2 if sub==KOSME else 1,action=action,assertionIds=ids))

plan=dict(id='lieb-recovered-2026-09-08-v1',facilityId='facility-j-lieb',title='J. Lieb Foods recovered historical evidence — 2026-09-08',subjects=subjects,sources=sources,assertions=assertions,tasks=tasks)
(base/'recovered-ingestion-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
print('Prepared',len(assertions),'assertions',len(sources),'sources',len(tasks),'tasks')
