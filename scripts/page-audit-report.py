"""Build the reviewable page catalogue and navigation graph from browser evidence.
Run after page-audit.py. No service calls or application mutations.
"""
import json,shutil
from pathlib import Path
from urllib.parse import urlparse,parse_qs

OUT=Path('artifacts/page-audit');DOC=Path('docs/page-audit');DOC.mkdir(exist_ok=True)
raw=json.loads((OUT/'results.json').read_text(encoding='utf-8'))
manifest=raw['manifest'];screens=manifest['screens'];results=raw['results']
for s in screens:
    s['files']=[f.replace('equipmentImages/ComponentRecordPage','machines/ComponentRecordPage') for f in s['files']]
actions=json.loads((OUT/'actions.json').read_text(encoding='utf-8'))
if (OUT/'extra-actions.json').exists():actions.extend(json.loads((OUT/'extra-actions.json').read_text(encoding='utf-8')))
if (OUT/'actions-initial.json').exists():
    for a in json.loads((OUT/'actions-initial.json').read_text(encoding='utf-8')):
        if a['name'].startswith('Tour ') and not any(x['name']==a['name'] for x in actions):
            a['attempt']='Initial run; tour assertions passed. Later run stopped during screenshot capture.';actions.append(a)

# Purpose/action review against route renderers, supplemented by the actual DOM inventory.
reviews={
'home':('Find a task; search across equipment, parts and documents.','Six task cards and More are clear at desktop size. Fails at 320px with 150% text: horizontal clipping.','Navigation exercised; enlarged-text layout failed.'),
'machine':('Choose Overview, Troubleshooting, Repair history, Electrical, Controls, Parts, Manuals or Photos for the selected machine. Start a repair.','Readable task list. Most detailed views require scrolling. Climax cabinet fixture has no photo; do not mistake that empty state for verified production photo coverage.','Eight sections and representative destinations clicked. Guided troubleshooting covered by earlier visual suite; live PLC data is not connected.'),
'repairs':('List and resume local repair drafts and submitted work.','Readable cards; “On this phone” is misleading on desktop.','Repair workflow exercised in disposable technician/admin sessions.'),
'repair':('Capture a machine problem, notes, files and work details; save a draft and prepare a summary.','Large controls; context and draft status take substantial room before entry fields.','Core repair journey passed before a later, unrelated home-layout assertion stopped the suite. Live microphone capture is unverified.'),
'repairSummary':('Review the captured repair, edit its summary and submit it for administrator review.','Long review form; initial direct-link audit uses a draft, not a populated completed job.','Submit/review path exercised by repair-browser-check.py.'),
'admin':('Enter the review inbox, app-change requests and administration tools.','Shared-save status block competes with the actual task choices.','Navigation checked. Production authorization and publication remain unverified.'),
'inbox':('Find submitted technician work and open its original evidence and proposed changes.','Empty state is readable; populated review appears in the separate repair workflow.','Technician submission and administrator review exercised in fixture.'),
'submission':('Read immutable original work, ask for clarification, propose edits, approve and apply changes.','Without a submission ID this route falls back to the inbox. A base-route screenshot alone cannot prove a review works.','Populated clarification/proposal/approval/application and original preservation exercised in repair workflow.'),
'requests':('Review proposed changes to the application and their release-process status.','Empty-state capture only.','Navigation checked; a populated request approval/release workflow was not exercised.'),
'inventory':('Search parts, photograph or upload a label, correct OCR, store a part, match machines, track locations, low stock and stock movements.','Duplicate top actions plus seven tabs push the task below the first screen, especially on phones.','Inventory transaction suite passed desktop/tablet/phone; seven sections captured.'),
'history':('Browse recovered plant evidence, uncertainties and field tasks; follow sources to equipment.','Repeated introduction and headings delay records. Collapsed-content links appeared in the DOM inventory and could not be clicked while hidden.','Visible route links checked; hidden-link attempts are inconclusive, not confirmed broken navigation.'),
'lines':('Inspect production lines and their equipment/flow documentation.','Tabs and repeated heading occupy the top.','Route links checked; line rationale save/reload passed. Every line and flow variant not exercised.'),
'documentation':('Prioritize missing field knowledge and documentation work.','Introductory copy and tabs delay the queue.','Navigation/geometry captured; new survey task save/reload passed.'),
'maintenance':('Record line membership, dependencies and service history for equipment.','Machine context is repeated before the form.','Process-stage field save/reload passed. All field-sheet and service-record variants not exercised.'),
'dependencies':('Document typed equipment dependencies with supporting evidence.','Form lies below explanation and production tabs.','Create an unverified dependency, reload the connections list and open its relationship type: passed.'),
'map':('Locate areas and equipment; select a record; edit layout when authorized.','At 1366×768 the map drawing starts below the first screen. Overview labels remain dense; readable area selection is essential.','Map-editor transaction suite passed including undo/redo/cancel and reload. Source map accuracy is not certified.'),
'assets':('Search equipment, open a machine, or browse devices grouped by area and line.','Primary list is straightforward. Device/area mode is denser and contains disclosures.','Representative machine links clicked. Device mode checked separately; inspect recorded animation/layout findings.'),
'asset':('Read a legacy detailed asset workspace: overview, capture, intelligence, record, documents and activity.','Black legacy tab strip differs from the newer shell; repeated identity and service link push content down.','Four explicit tabs captured; not every legacy action or field-capture mutation exercised.'),
'area':('Review equipment and field observations for one area; export its walk pack.','Global verification information precedes selected-area content. Empty Warehouse E is a legitimate captured state.','Navigation captured; walk-pack content accuracy not verified.'),
'documents':('Search/filter manuals and evidence, open a document, and follow machine context.','Large filters and group cards make a long list. Selected-document and Draft-filter states captured.','Document links exercised; evidence image viewer tested separately. Every PDF page and external source not checked.'),
'cabinet':('Inspect a cabinet drawing/photo and choose a contained component.','Technical workspace uses a different visual style; drawings require contained pan/zoom. Missing-photo state captured for Climax fixture.','Representative component navigation captured. Every drawing hotspot not individually tested.'),
'wulftec':('Rotate and inspect the reconstructed WCRT-200 model and its assemblies.','Model begins below controls; technical dimensions and reference text are large.','Viewer rendered. All camera modes/assemblies and physical accuracy not verified.'),
'component':('Read a device identity, parent equipment, evidence and documented connections.','Clear identity card but several layers of context precede device details.','Parent-machine and equipment links clicked.'),
'field':('Capture field evidence, observations and documentation against selected equipment.','Repeated machine title and controls delay entry.','Render/navigation checked; earlier visual suite covers field workspace. Every capture/apply variant not exercised here.'),
'relationships':('Trace documented connections and assess impact around a selected asset.','Direct entry displays “Select an asset” with no inline asset picker; map is the available next step.','Direct-state links checked; every relationship traversal not exercised.'),
'more':('Choose Everyday tasks, Records & review, Admin or Advanced Tools.','Large group buttons fit desktop; stacked phone choices postpone the actual tool list.','All groups captured and representative destinations clicked. Earlier large-print workflow checked returning to the selected group.'),
'account':('Refresh permissions, set username/password and manage passkeys.','Readable single-column security form.','Refresh and username persistence passed in fixture. Real password delivery/passkeys/session policy unverified.'),
'review':('Compare and apply proposed canonical data changes.','Shared-save panel precedes the reviewer’s task.','Proposal workflow covered by fixture suites; real multi-user roles unverified.'),
'assetAdd':('Create an equipment record with identity, type, area and verification state.','Large, readable fields; form spans multiple screens.','Create workflow passed in large-print suite at all three sizes.'),
'manage':('Find equipment, edit it and manage its record.','Phone list rows overlap: names and metadata spill into neighboring buttons, and Edit wraps into letters. Machine-scoped entry still presents the whole list.','Edit, cancelled deletion and CSV readback exercised; irreversible production deletion not performed.'),
'connection':('Create an evidence-backed relationship between two assets.','Long vertical form, with clear source/relationship/destination ordering.','Verified-without-evidence rejection, unverified creation and reload passed in fixture.'),
'evidence':('Attach photos/PDFs/files to equipment and reopen them.','Large upload area; selected asset is repeated in header/form.','PNG upload, image open/close and reload passed in fixture.'),
'observation':('Log a field observation against equipment.','Large clear text entry.','Save and reload passed in fixture.'),
'setup':('Edit facility details, areas and map records.','Three setup sections are visible; forms use generous controls.','Facility rename/reload and area creation passed. All Map Records operations not exercised.'),
'database':('Export/import plant backups and equipment packages.','Confirmed horizontal clipping on 390px phone: statistics/export/options do not fit.','Export covered in asset workflow. Destructive replacement/import compatibility not exhaustively tested.'),
'settings':('Change contrast, motion and map/display preferences.','Clear large select controls.','Contrast and reduced-motion persistence passed.'),
'conflicts':('Compare shared/local conflicts and choose an explicit resolution.','Empty conflict state has a large shared-save panel above explanation.','Concurrent conflict, explicit resolution and reload passed in simulated cross-device suite.'),
'health':('Validate the data model and open/trace incomplete records.','Readable validation panel, but destination controls are deceptive because they do nothing.','Run verification passed. Open and Trace both failed; dispatch listener is mounted only in Dashboard.'),
'import':('Preview CSV records, validate references and approve import.','Clear explanation and file picker.','One asset CSV preview/import/readback passed in fixture. Full malformed-file matrix not exercised.'),
'help':('Read workspace guidance, set guide preferences and open the project tour.','Introductory Genie content dominates the first screen.','Tour play/next/pause passed at phone and desktop sizes; every guided lesson not exercised.'),
}
findings=[
{'id':'F7','priority':'Medium','pages':['asset'],'title':'Phone asset tabs conceal the selected section','detail':'The phone tab strip initially exposes only Overview. Direct links to Record, Intel, Docs and Capture show different content below, but the selected tab is offscreen in the horizontal strip. Some lower action labels also wrap awkwardly.','evidence':['phone-screen-61-0.png','phone-screen-62-0.png','phone-screen-63-1.png'],'fix':'Provide a visible current-section selector on phones; avoid making users discover a hidden horizontal tab strip.'},
{'id':'F6','priority':'High','pages':['manage'],'title':'Manage assets rows overlap on phone','detail':'At 390×844, wrapped equipment names and metadata overflow their 72px rows and overlap the next entry. Edit is squeezed into individual letters. This is visible despite passing minimum-font/minimum-target checks.','evidence':['phone-screen-29-0.png'],'fix':'Prevent list rows from flex-shrinking, allow content-driven height, and reserve space for Edit. Check text containment, not just button dimensions.'},
{'id':'F1','priority':'High','pages':['health'],'title':'Data health Open and Trace are dead ends','detail':'Both clicks leave the page unchanged. PlantManager dispatches iag-focus-verification-target, but only Dashboard installs its listener and Dashboard is not mounted on this route.','evidence':['action-1.png','action-2.png'],'fix':'Navigate through the shared router, then focus the requested record/trace. Add tests from the actual health route.'},
{'id':'F2','priority':'High','pages':['database'],'title':'Plant database clips horizontally on phone','detail':'Reproduced at 390×844 in the full large-print route suite. Statistics, export and replacement controls extend past the available width.','evidence':['../large-print-390-database.png'],'fix':'Stack the statistics and import choices on phones; allow labels to wrap and constrain field widths.'},
{'id':'F3','priority':'High','pages':['home'],'title':'Directory fails with enlarged text on a narrow phone','detail':'At 320×900 and 150% text, page-scroll reports clientWidth 340 and scrollWidth 374. The repair suite stops here after its core transaction checks.','evidence':['../FAIL-repair-text-overflow.png'],'fix':'Make shell/navigation and task cards reflow at 320px with enlarged text; retain the failing assertion.'},
{'id':'F4','priority':'Medium','pages':['map','inventory','more','admin','review','conflicts','field','maintenance','area','help'],'title':'The first screen often shows chrome instead of the task','detail':'Large type is present, but repeated titles, context, tabs, status blocks and introductory copy consume the initial viewport. Map drawing is below the initial desktop fold; inventory entry is displaced by duplicate navigation.','evidence':['desktop-screen-15-0.png','phone-screen-8-0.png','phone-screen-25-0.png'],'fix':'Keep one useful title/context line. Put the main action or working surface immediately beneath it, and disclose secondary navigation/status.'},
{'id':'F5','priority':'Medium','pages':['asset','cabinet','relationships'],'title':'Legacy technical workspaces use a different interaction pattern','detail':'Legacy black tabs and technical panels coexist with newer task cards. Direct Troubleshooting entry asks for an asset without an inline picker.','evidence':['desktop-screen-17-0.png','desktop-screen-24-0.png'],'fix':'Use consistent task navigation and provide a clear asset selector at an empty trace entry.'},
]
nodes=[];edges=[]
for s in screens:
    if s['page']=='external':
        s['page']='standalone-'+s['id']
        nodes.append({'id':s['page'],'title':s['title'],'purpose':s['purpose'],'visual':'Standalone page captured and visually reviewed on desktop and phone. Separate navigation shell.','functional':'Tour playback tested separately. Archive links and 3D controls are not all exercised; rendering is not full content verification.','parent':'Standalone return link','files':s['files'],'screens':[s['id']]})
        continue
    if not any(n['id']==s['page'] for n in nodes):
        purpose,visual,functional=reviews[s['page']]
        nodes.append({'id':s['page'],'title':s['title'],'purpose':purpose,'visual':visual,'functional':functional,'parent':s.get('parent'),'files':s['files'],'screens':[]})
    next(n for n in nodes if n['id']==s['page'])['screens'].append(s['id'])
for r in results:
    s=next(s for s in screens if s['id']==r['screen'])
    for link in r.get('links',[]):
        dest=parse_qs(urlparse(link['resolved']).query).get('page',[None])[0]
        if not dest:
            dest=next((x['page'] for x in screens if x.get('path') and urlparse(link['resolved']).path.endswith('/'+x['path'])),None)
        if not dest or link['href'].startswith('#') or not any(n['id']==dest for n in nodes):continue
        click=next((c for c in r.get('clicks',[]) if c['href']==link['href']),None)
        evidence='clicked' if click and click['status']=='pass' else 'inconclusive' if click else 'rendered only'
        key=(s['page'],dest,link['label'],link['href'])
        old=next((e for e in edges if (e['from'],e['to'],e['label'],e['href'])==key),None)
        if old:
            if evidence=='clicked':old['evidence']=evidence
        else:edges.append({'from':s['page'],'to':dest,'label':link['label'] or '[collapsed/unnamed link]','href':link['href'],'evidence':evidence,'screen':s['id']})
for start,end,label in [('repair','repairSummary','Prepare/review summary'),('repairSummary','submission','Submit for administrator review'),('health','area','Open area verification target'),('health','asset','Open asset verification target'),('health','relationships','Trace verification target')]:
    edges.append({'from':start,'to':end,'label':label,'href':'','evidence':'broken' if start=='health' else 'workflow suite','screen':''})
for start,end,label in [('map','machine','Open selected equipment details'),('map','area','Open selected area details'),('assets','asset','Device directory: Open asset record'),('assets','component','Device directory: choose contained device')]:
    edges.append({'from':start,'to':end,'label':label,'href':'','evidence':'source only','screen':''})
summary={'states':len(results),'screens':len(screens),'pages':manifest['pages'],'standalone':len(nodes)-manifest['pages'],'screenshots':sum(len(r['screenshots']) for r in results),'clickPass':sum(c['status']=='pass' for r in results for c in r['clicks']),'clickInconclusive':sum(c['status']!='pass' for r in results for c in r['clicks']),'automatedFindings':sum(bool(r['issues']) for r in results)}
data={'manifest':manifest,'summary':summary,'nodes':nodes,'edges':edges,'findings':findings,'actions':actions,'results':results}
(OUT/'audit-data.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
# Portable, source-controlled graph excludes large captured DOM text and screenshots.
(DOC/'navigation.json').write_text(json.dumps({k:data[k] for k in ['manifest','summary','nodes','edges','findings','actions']},indent=2),encoding='utf-8')
mmd=['flowchart LR']
for n in nodes:mmd.append(f'  {n["id"].replace("-","_")}["{n["title"]}"]')
for start,end in sorted(set((e['from'],e['to']) for e in edges if e['from']!=e['to'] and e['from']!='external')):mmd.append(f'  {start.replace("-","_")} --> {end.replace("-","_")}')
(DOC/'navigation.mmd').write_text('\n'.join(mmd)+'\n',encoding='utf-8')

md=['# Page-by-page system audit — 18 September 2026','',f'Reviewed app commit: `{manifest["commit"]}`. Fetched integration/live Pages baseline at audit start: `{manifest["baseline"]}`. **These are different versions. This audit covers the draft readability branch, not a deployment of it.**','',
'Local Chrome, disposable authentication/service fixtures, published snapshot route identifiers. No production records were changed. Runtime backend credentials, real authorization/passkeys, email, microphone permissions, physical equipment truth and actual cross-device publication remain unverified. A successful link click is not a successful business transaction.','',
'GitHub CI for the reviewed commit is **failed**, at the enlarged-text repair-journey geometry assertion: https://github.com/tobystrings/industrial-asset-graph/actions/runs/35381930053 . The draft branch is not demo-ready.','',
f'Coverage: {summary["pages"]} registered pages; {summary["screens"]} explicit page/subpage/standalone states; {summary["states"]} viewport captures; {summary["screenshots"]} screenshots; {summary["clickPass"]} successful representative link clicks. {summary["clickInconclusive"]} link attempts were inconclusive (including collapsed links and navigation-context changes). Raw measurements and screenshots are in `artifacts/page-audit/`; open `index.html` there for the interactive graph and evidence.','',
'## Walkthrough syllabus','',
'1. **Start and orient:** Directory → Equipment → Machine → section → record/document/component. Check the parent and recorded Back destination at each step.',
'2. **Do a job:** My work → Repair → Finish repair → Review Inbox → Review submission → machine history.',
'3. **Find and account for spares:** Parts Inventory → capture/OCR → part → location/balance → stock activity.',
'4. **Understand the plant:** Map → Area → Asset; Cabinet → Component; Troubleshooting → documented relationships.',
'5. **Build knowledge:** Documents, Historical evidence, Production lines, Documentation queue, Equipment field sheet, Dependency records, Field documentation.',
'6. **Maintain records:** Add equipment, Manage assets, Connections, Attach evidence, Record a finding, Review changes, Data health.',
'7. **Operate the system:** Administration, App-change requests, Account, Plant setup, Settings, Resolve sync conflicts, Plant database, Import records.',
'8. **Train and browse sources:** Guide & training, standalone project tour, standalone machine viewer, evidence archive and recovered sources.','',
'## Confirmed issues and usability findings','']
for f in findings:
    evidence=[]
    for image in f['evidence']:
        source=OUT/image
        if source.exists():
            target=DOC/'evidence'/source.name;target.parent.mkdir(exist_ok=True);shutil.copyfile(source,target)
            evidence.append(f'[{source.name}](evidence/{source.name})')
    md.extend([f'### {f["id"]} · {f["priority"]} · {f["title"]}','',f['detail'],'','Recommended correction: '+f['fix'],'','Evidence: '+', '.join(evidence),''])
md.extend(['## Functional evidence','',
'Visual inspection covered the initial desktop and phone capture of every registered page and listed substate, plus selected scrolled samples. All 353 images are available; every scroll position, modal, role and data permutation is not visually signed off. Two device-directory captures timed out waiting for finite animations; their screenshots exist, but their large-print assertion is inconclusive. The bounded timeout exposes this harness limitation rather than silently accepting it.',
'- Inventory workflow: passed at 1366×768, 768×1024 and 390×844.',
'- Map editing: rename/add/remove-wall/merge, asset preservation, undo/redo/cancel, markup isolation and reload passed.',
'- Simulated publication: cross-device rename and attachment bytes, duplicate prevention, draft recovery, concurrent conflict, explicit resolution and reload passed.',
'- Repair suite: core submission/review/clarification/approval/application checks reached completion; full suite **failed** at the subsequent 320px enlarged-text Directory check. Later checks in that invocation did not run.',
'- Large-print suite: asset create/edit/cancel-delete/export/isolation checks passed; full suite **failed** on phone Plant database overflow.',
'- Earlier nine-viewport visual suite passed on the same app commit. The new failures show that its coverage was incomplete; it is not evidence that every page/task works.',''])
for a in actions:md.append(f'- {a["status"].upper()}: {a["name"]}. '+(a.get('error','').split('\n')[0] if a['status']=='fail' else 'Disposable fixture or local media.'))
md.extend(['','## Navigation behavior and graph','',
'The interactive graph uses actual rendered destinations and representative clicks. Select a page to see incoming/outgoing edges, purposes, controls, states and screenshots. Edges distinguish clicked, rendered only, inconclusive, workflow-suite, source-only and broken. The anchor sweep checks the destination page key; it does not assert every context/query argument. Desktop runs click representative destinations; phone runs capture layout, supplemented by separate workflow and Back tests. Shared Home/Account/My work links can be hidden to expose task relationships. Button-only transitions are not exhaustively covered by anchor extraction; explicit workflow/broken/source edges are added separately.','',
'Back uses recorded in-app history when available; a direct link uses the route’s parent fallback. The per-page fallback below is therefore not always the actual Back destination. Route aliases (`view`, `manager`, `trace`, `field`) are normalized by `readPage`; they are not additional registered pages.','',
'Machine sections, inventory sections and asset tabs are states within a page. The graph preserves their exact link query strings. Standalone content does not use the same app shell or Back behavior.','',
'## Every registered page',''])
for i,n in enumerate(nodes,1):
    dest=sorted(set(e['to'] for e in edges if e['from']==n['id'] and e['to'] not in ['home','account','repairs']))
    rows=[r for r in results if r['screen'] in n['screens']]
    issue=[x for r in rows for x in r['issues']]
    md.extend([f'### {i}. {n["title"]} (`{n["id"]}`)','',
      '- **Does:** '+n['purpose'],
      '- **Goes to:** '+(', '.join(dest) or 'Shared navigation / local controls; no additional rendered page link captured.')+'.',
      '- **Direct-link Back fallback:** `'+str(n['parent'])+'`.',
      '- **Visual review:** '+n['visual'],
      '- **Functional review:** '+n['functional'],
      '- **Measured states:** '+str(len(rows))+' desktop/phone captures. '+('Automated findings recorded; inspect the artifact.' if issue else 'No automated finding recorded in these captured states; not a blanket accessibility pass.'),
      '- **Source:** '+(', '.join('`'+f+'`' for f in n['files']) or 'Standalone exported content; see the path in the manifest.'), ''])
md.extend(['## Remaining verification before calling this demo-ready','',
'Fix F1–F3 and rerun the failing checks without reducing thresholds. Review the first-screen task hierarchy (F4), then complete populated requests, full legacy capture/trace/hotspot flows and role-specific states. Verify real backend permissions and synchronization against an authorized test facility. Exercise keyboard/screen-reader flows and actual phone input/media. Recheck the deployed commit after merge/deployment; a draft PR and green build do not establish deployment.','',
'## Reproduce','',
'Build the app using the documented synthetic visual-test environment and run a preview on port 4176. Then:','',
'```text','npx tsx scripts/page-audit-manifest.ts','python scripts/page-audit.py','python scripts/page-audit-actions.py','python scripts/page-audit-report.py','```','',
'Use `--resume` only with unchanged app build/manifest; it retains previously completed captures. Browser-action scripts intentionally record failures as evidence. Read their JSON results rather than assuming exit zero means all actions passed. Existing regression suites retain their failing assertions.',''])
(DOC/'README.md').write_text('\n'.join(md),encoding='utf-8')

template=Path('scripts/page-audit-template.html').read_text(encoding='utf-8')
(OUT/'index.html').write_text(template.replace('/*AUDIT_DATA*/',json.dumps(data).replace('</','<\\/')),encoding='utf-8')
print(json.dumps(summary))
