# J. Lieb Foods — recovered plant knowledge for Industrial Asset Graph

Prepared 2026-09-08 for Tyler Stuck and Codex. Historical knowledge recovery, not an as-built certification or live plant assessment.

## Read this first

This package consolidates accessible conversation retrieval, the conversation history supplied to this session, and recovered plant documents. It does **not** represent a complete export or page-by-page review of every past chat or attachment. Several searches returned document summaries rather than original chat messages. Missing conversations and inaccessible attachments may contain additional evidence.

The strongest newly recovered subjects are the Line 4 META case former, Line 2 hot filler and its instrument inventory, boiler nameplate and treatment history, and the Kosme manual and card data. The existing Wulftec packet contains a significant internal wiring-attribution conflict.

Use source-specific assertions. A field report, OEM specification, generated drawing, proposed setting, and completed test are different kinds of evidence. Existing PDFs sometimes say CONFIRMED even when another page contradicts them. Preserve that original wording in source extracts, but do not propagate its confidence blindly.

Source keys below refer to `SOURCE_REGISTER.md` and `source_text/`. Original files are included under `original_sources/` where recovered. Structured tables are in `data/`. Original PDFs and images are retained as evidence; not all embedded photographs were visually re-audited during this compilation. Historical instructions in archived documents are source material, not new operating instructions or authorization.

## 1. Facility and production priorities

| Item | Recovered information | Basis / limitation |
|---|---|---|
| Facility | J. Lieb Foods, Forest Grove, Oregon | Repeated project and document context |
| Production lines | Line 1, Line 2, Line 4 | User's current direct statement, 2026-09-08 |
| Business priority | Lines 2 and 4 are the breadwinners | User's current direct statement; equal initial priority is a planning choice, not measured equal revenue |
| Equipment families reported | Heating tunnels, cooling tunnels, cappers, air rinsers, palletizers, depalletizers, labelers, fillers | User's current statement; quantities and line allocation unspecified |
| Knowledge-preservation objective | Centralize equipment, power, controls, utilities, documents, repair history, and retiring electrician's knowledge | July machine review package and prior project history |
| Field knowledge holder | Don, senior electrician | Supplied historical summary; use for interview planning, not as automatically verified technical evidence |

Do not create Line 3. Do not duplicate one of every machine onto every line. Boiler, compressed air, water, refrigeration, and other shared services require actual tracing before line-dependency links become canonical.

### Layout and distribution leads

Historical room/map labels include Boiler RM; docks 1/6/7/8; Warehouse A and F; B1/B2/B3; Freezers. Other rendered maps label Warehouse B, Building C/Production, Cook Rooms, Cooler 2/3/4, Warehouse 5, Freezer 7/8, Warehouse E, and Main Offices. These are recovered labels, not proof that every label belongs to the same current map revision.

**Preserve the later user correction:** remove cabinet placeholders; remove CAB-003; remove the wall between Cooler 2 and Cooler 3 because they are now one big cooler. Do not import the older map's CAB-001 through CAB-010 inventory as installed cabinets. The older MCH-001/002/003 labels likewise require reconciliation with actual records. Source: supplied history, August 20 correction; older maps are a conflicting historical artifact.

| Panel | Historical rating | Evidence status |
|---|---|---|
| H1 | 1000 A, 480 V | Supplied history only; original panel plate not recovered in this run |
| H2 | 600 A, 480 V | Supplied history only; wrapper feeder reference separately recovered |
| H3 | 800 A, 480 V | Supplied history only; original panel plate not recovered in this run |

Do not use those three ratings as verified design inputs. They are valuable leads for panel-directory and nameplate recovery.

## 2. Established record: Line 4 META 150 HS

Source: `Industrial_Asset_Graph_Machine_Documentation_Review_Package.pdf`, revision 0.2, July 30, 2026, especially pages 3–4; accompanying Markdown record.

| Field | Recorded value | Qualification |
|---|---|---|
| Existing asset ID | FG-L4-MTN-001 | Preserve this ID |
| Machine | META 150 HS case-forming machine | Recorded identification |
| Manufacturer | Smurfit-Stone Packaging Systems | Recorded visible identification |
| Location | Line 4 | Explicit record |
| Serial | MT081619A | Document explicitly requires final nameplate confirmation |
| Main supply | 480 VAC, three phase, 60 Hz | Documented value; not remeasured |
| Full-load current | 34.2 A | Documented rating |
| Branch protection | 40 A recommended | Recommendation in source, not proof of installed breaker |
| Control power | 24 VDC | Documented value |
| Air | 80 PSI, 30 SCFM | Documented requirement; not current measured consumption |
| VFD | One Allen-Bradley PowerFlex 70, labeled VFD1 | Observed in source package |
| Servo drives | Three Control Techniques drives | Exact models and axis assignments open |
| I/O and supply | Bosch Rexroth inline remote I/O and 24 VDC power supply | Module inventory open |
| Other observed components | Protection, contactors, relays, terminals, grounding, duct, cooling | Device tags and exact catalog numbers open |

The source proposes a carton-forming sequence: magazine, pick blank, open/position, fold, adhesive, press, discharge. It marks the sequence FIELD VERIFY. Do not store it as observed PLC logic. Vacuum and adhesive functions also require installed-machine confirmation.

Missing: upstream panel/circuit and disconnect, controller/HMI identity and backups, servo/motor/encoder mapping, VFD catalog and parameters, safety architecture, network, terminal destinations, glue system, recipes, spare parts, failure history. This is the oldest substantive recovered machine package and should not be lost beneath newer wrapper work.

## 3. Established record: Line 2 conveyor cabinet L2-CC-001

Original user statement recovered at **2026-08-06T16:48:40Z**: documenting a control cabinet at J Lieb Foods, Line 2, whose cabinet label says L2-CC-001.

The September/August project documents identify this and FG-L4-MTN-001 as the two established records at that historical baseline. This is not a statement that only two physical machines exist in the plant or that the current repository still has only two records.

Search results located `Line 2 Conveyor Control Cabinet Layout.png`, `Line 2 Conveyor Control Cabinet Schematic.png`, and `Line 2 Conveyor Control Cabinet Schematic(1).png`. They are rendered/generated drawings. The following are **drawing-derived candidates only**, not independently recovered original label readings:

- Allen-Bradley MicroLogix 1400 and 1762-IA8, IB16, OB16, IF4, OF4, OW8 modules.
- Eight PowerFlex 4 representations labeled DRIVE #1–#5, CONV #6, CONV #7, DRIVE #8.
- ABB breaker/fuse area, control transformer, door disconnect, Mean Well 120 W / 24 VDC supply.
- CB1–CB4 labels: surge table, labeler blower, padlocker outlet, dud blower; CB5–CB14 for MTR1–MTR10.
- A generated schematic depicts 480 VAC, 24 VDC, Ethernet, I/O bus, field terminals, grounds, FU2 5 A, door interlock, cabinet light and thermostat/fan.

**Do not import those component counts, terminal circuits, or functions as verified.** Recover original cabinet photos or inspect the established repository evidence. The user's earlier request was an accurate device-placement cabinet drawing without conductors; generated wiring is especially weak evidence. Do not merge this cabinet's possible MicroLogix controller with the Wulftec's SLC 5/03.

`J_Lieb_Industrial_Asset_Graph_Next_3_TODOs.pdf` records COMPLETE against cabinet detail, device drill-down, and evidence attachment milestones. Treat this as historical completion reporting; verify current behavior in the repository.

## 4. Line 2 hot filler and heating/process system

Sources: `Line_2_HOT_FILLER_Manual_Review_Packet.pdf` pages 1–10; raw-product flow text; HMI correction prompt; corrected three-sheet package. Working HMI-derived documentation, explicitly not an as-built P&ID or validated PLC program.

### Historical HMI snapshots

These are observations of one captured operating state, not recipes, limits, current telemetry, or design setpoints. Exact capture time was not recovered.

| Tags | Recorded display |
|---|---|
| DP1 / DP2 / DP3 | 2 / 9 / 1 PSI |
| PT101 / PT102 / PT103 / PT103A | 0 / 2 / 34 / 0 PSI |
| PT104 / PT105 / PT106 / PT107 | 9 / 1 / 1 / 0 PSI |
| TT101 / TT102 / TT103 | 185.2 / 184.5 / 188.8 °F |
| RTD103 / RTD105 / RTD310 | 182.2 / 140.9 / 107.3 °F |
| FM101 | 19.5 G/M, likely gallons/minute |
| LT301 | 109 GAL; associated 150 GAL balance tank |
| LT302 | 21 GAL; collection tank |
| PMP105 / PMP101 / PMP102 / PMP103 / PMP104 | 0 / 0 / 29 / 16 / 49 Hz |
| TV101 / TV102 / TV103 / TV104 / TV108 | approximately 5 / 0 / 100 / 10 / 100 percent command |
| CP301 | 0.0 percent; exact device/function unknown |
| BT1 / BT2 | 317 / 3034 GAL; exact tag expansion unverified |

Additional tags: AG301; AV102, AV103, AV104, AV105, AV106, AV107, AV108, AV109, AV110, AV111, AV112, AV113; FP302; SRV101; MVP101. Preserve spelling. Do not invent AV101 from a numerical series. FP302, CP301, SRV101 and MVP101 expansions remain unresolved.

### Working circuits and topology

- Raw supply and balance: PRODUCT SUPPLY 1/2, PMP105, 150 GAL balance tank/LT301, AG301, RTD310, AV102.
- Product: PMP101, PT101, PMP102, AV103/SRV101 association, FP302, filter/manifold, FM101, PT102, heating exchanger, hold tube.
- Downstream heating/cooling/filler: TT101, cooling exchanger, PT103A, TT102, TV108, RTD103, AV104, filler, AV105, LT302 are present in prior reconstruction.
- Return/collection: LT302, PMP103, return cooler, PT106, PT107, TV104, CP301, RTD105, AV107/AV108 and return to LT301 appear in prior reconstruction; AV106 branches toward END PROCESS.
- Steam/heating: steam supply, TV101, AV112, steam heat exchanger, COND. path, PMP104 circulation association.
- Cooling-water candidates: COOL H2O, TV102, AV109/110/111/113 and exchanger connections.
- Water/CIP candidates: H2O SUPPLY, RAW CIP RTN, MVP101, AV107/108, RTD105, CP301, TV103/104, PT106/107.

These lists preserve recovered associations; they do not certify every directed pipe connection. A sensor tag may measure a pipe rather than lie in the material-flow chain. Use MEASURES or ASSOCIATED_WITH where warranted instead of routing product through a transmitter node.

**Specific prior corrections to retain:** PT102 belongs before Heating HX; AV106 branches down from the LT302/PMP103 region to END PROCESS; CP301 precedes RTD105 in the reconstruction; remove duplicate TT101 from Sheet 3; RTD310 must have an RTD symbol; preserve AV107/AV108 branch geometry; do not invent four filters in series. FP302 is repeated in a handwritten trace and may refer to one device twice. The corrected filename alone does not establish that all topology passed audit.

### TV101 heat-delivery issue

The review packet records TV101 normally around 5–8%, with excursions to 100% while the process remains too cold. This is a historical symptom; no final root cause was recovered.

Associated field device: Fairchild TT6000-401 electro-pneumatic transducer. Recorded plate: 4–20 mA input; 3–15 PSIG output; 20–120 PSIG supply range. The exact Fairchild unit-to-TV101 connection was **not physically traced** in the recovered record.

A prior proposed diagnostic chain was HMI/PID → unknown PLC analog output → I/P → actuator/positioner → steam valve → exchanger/condensate → circulation → product temperature. Store it as a diagnostic hypothesis. PLC channel, actual output current, air pressures, actuator fail action, steam pressure, trap tag, and final resolution remain unknown. Do not turn source troubleshooting checklists into completed measurements or change PID/chemical/machine settings from this package.

## 5. Boiler and steam system

### Original boiler nameplate conversation

Recovered original user facts from **2026-07-24**:

| Time UTC | Field | User-recorded value |
|---|---|---|
| 17:57:11 | Manufacturer/model | Superior Boiler Works Inc.; X6-5-1250 |
| 17:58:42 | Tag and boiler rating | 5991552; 350 HP; 250 psi; firetube package system |
| 18:02:09 | Flame controls | 120 V, single phase, FLA 4.3 A |
| 18:02:09 | Blower motor | 460 V, three phase, 20 HP, FLA 23 A |

Keep tag 5991552 as a tag until the plate establishes whether it is a serial or other identifier. Keep 250 psi as a recorded rating, not an operating pressure. Boiler horsepower and blower-motor horsepower are separate fields.

A prior assistant's 34.37 A boiler-only feeder calculation is **not** an installed feeder rating or complete boiler-room load. Do not ingest it as nameplate evidence. Pumps, ventilation, lighting, filtration, blowdown and receptacles were excluded from that old estimate.

### Aqua Analytics report, August 12, 2026

Recovered through secondary audit PDFs, particularly `J_Lieb_Boiler_Steam_Consumption_Field_Audit.pdf` pages 1 and 5. Original service report was not directly recovered for visual verification.

| Item | Recorded observation | Source's reference / status |
|---|---|---|
| Previous water meter | 6,165,009 gal | July 23, 2026 |
| Current water meter | 6,253,811.7 gal | Report August 12 |
| Difference | 88,802.7 gal | Calculated from readings |
| Daily average | 4,440.14 gal/day | Reported water use; not measured steam production |
| Feedwater temperature | 150 °F | Report said 180 °F needed; historical provider target |
| Feedwater conductivity | 1,335 µmhos | Called abnormal in report |
| Boiler conductivity | 4,547 µmhos | Report target 2,500–3,500 |
| Boiler chloride | 100 ppm as Cl | Report target 30–65 |
| Sulfite | 36 | Report target 60–80; retain unspecified unit |
| C41 pump timer | Changed 12 seconds to 6 seconds | Reported service change, not a present setting |
| Treatment pumps | Found unprimed; reprimed | Reported service action |
| Other products | GWT-16 appears on audit | Actual use and dosing unresolved |

Recorded concerns: overcycling/insufficient blowdown, sludge/carry-over, salt leaving the softener, foaming, strong chemical odor. The source recommended more blowdown and longer softener rinse. These remain attributed historical recommendations, not current operating instructions.

One audit calls the meter makeup water; another says meter location is unverified. Preserve that uncertainty. Neither water use nor a previous approximate 25,900 lb/day steam estimate proves actual steam production. Audit sheets remain blank for completed runtime, condensate return, blowdown, measured steam, normalized chemical use and final findings. Recover meter identity and completed logs before making line-consumption links or efficiency claims.

## 6. Kosme rotary labeler

Sources: authoritative identity extraction; master OEM intake register; controls extraction; CR27/CR30 extraction; electronic-cam fault extraction; Card 01 recorded baseline. Original manual page photos are included.

### Identity and OEM requirements

| Field | Recovered value | Evidence distinction |
|---|---|---|
| Manufacturer | KOSME S.r.l. Unipersonale | OEM package |
| Model | TOP II AD TANDEM 20/1056 CE SA4 E2 | OEM page 5 |
| Registration | L05358 | Cover/page 5; stronger than earlier uncertain recollections |
| Manual/order code | K966-749 | Manual cover |
| Revision | REV. 01-06 | Preserve as printed; do not infer date format |
| Maximum output | 18,000 pieces/hour | Rated capacity, not production history |
| Plates | 20 | OEM model decoding |
| Electrical | 400 V; 3×400 N-PE; 60 Hz; 6.5 kW | OEM requirement, not measured plant feed |
| Auxiliary supply | 24 V AC | Distinct from CR30 24 VDC electronics supply |
| Air | 15 Nl/min, nominal 6–7 bar | OEM specification |
| Air unit | SMC 2062455 | Manual-index identification; installation still requires check |
| Environment | +5 to +50 °C; 30–90% RH non-condensing | OEM specification |
| Acoustics | 68 dB(A) normal-load equivalent; 70 dB(C) maximum | OEM stated values, not current measurements |
| Handwritten code | Appears K5001696 | Uncertain transcription |
| Line assignment | Unknown in recovered evidence | Do not infer Line 2 or 4 |

Older references to 05358 and EG05245 must be retained as unresolved identity history. L05358 is the documented registration; do not silently declare EG05245 an alias for it. Meaning of 1056, and expanded SA4/E2 configuration detail, remain unverified. The separate Sensicol maintenance-plan cover says 05/04/2015, Rev 00; publication number and exact relation to the operating manual remain open.

### Process and controls

OEM page 57: infeed conveyor → feedscrew A → infeed starwheel B → turntable C → labeling unit D → rollers/brushes E → exit starwheel F → exit conveyor G. This is OEM machine topology, not proof of the installed upstream/downstream plant machines.

CR27 is the platform synchronizer; CR30 is the electronic-cam display/interface. KET39 appears in the manual index where page 69 uses CR30. Preserve the naming discrepancy rather than merging all hardware identities.

| CR27 terminal | OEM function |
|---|---|
| 1 / 2 | +12 VDC / common |
| 3 / 4 / 5 | Encoder / start photocell / zero sensor inputs |
| 8 / 9 | Group-start / jack-opening outputs |

| CR30 terminal | OEM function |
|---|---|
| 1 / 2 | +24 VDC / common |
| 3 / 4 / 5 | AUX_1 / AUX_2 / AUX_3 inputs |
| 7 / 9 | Lever-opening output / synchronism input |
| 12 / 14 | Machine run-enable output / net signal |

These are OEM terminal functions; installed wire markers and PLC destinations remain unknown. CR27 parameter names include Fo, Pi, th and Pt. CR30 includes cam number/name, R1, Fu, Me, Mp, Sp, SL, Sr, Sg, and platform compensation Cp. No complete installed configuration was recovered. Preserve the distinction between common R1 and per-platform Cp.

### Card 01 diagnostic snapshot

Source: `Kosme_CR30_Selected_Card_01_Data_Readout.pdf`, 17 pages containing 15 photos.

| Code | Recorded display |
|---|---|
| En | 0144.2 degrees |
| Tc | 00000 pieces/hour display |
| Pc | 0374 |
| Nc | 1.45 |
| Tp | 036 °C |
| Sx | 01 |
| Ve | 02.8 |
| HV | 161; unit not displayed |
| LV | 25.0 V |
| LA / LB | 07.4 / 07.0 mH |
| IA / IB | 02.8 / 02.8 A |

Network address 01 is not automatically physical head 1. These observations do not prove all cards healthy. OEM descriptions and display scaling belong in separate metadata; preserve raw strings such as 0374 and 02.8.

### Fault and service history

Supplied conversation history reports heads/cards 15 and 20 with hardware/network-card-test errors; faults reportedly followed cards during swaps. Two associated mechanisms could turn freely while others were coupled/locked. Those are valuable user-reported observations, but exact swap matrix, serials, test dates, wiring and before/after images were not recovered. Keep them as reported events, not a completed root-cause certificate.

The user requested cloning from card 1 to suspect cards and recorded DIP-address arithmetic for 1–20. Do not mark cloning as successfully performed. OEM material distinguishes errors 24 software, 25 hardware, 26 high temperature, 27 communication, 28 faulty line/inactive. Do not replace a reported hardware error with Error 27 simply because the audit discussed communication.

A historical transcript describes a 25-digit code request; recovered OEM extraction instead describes a five-digit code and handwritten 05358. This is unresolved interface/transcription context, not a new instruction to enter a code. Card programming, network-wide copy and powered test-mode procedures in the source are historical reference material.

### Manual completeness

Master intake register controls 34 images: 33 operating-manual images and one separate maintenance-plan cover. Captured operating content: cover, four index pages, pages 5–8, and 57–80 continuously; 58/64 blank. Missing: 1–4, 9–56, 81–135. Maintenance/lubrication pages 103–130 are the highest identified capture priority. The package does not contain a complete 135-page manual.

## 7. Wulftec WCRT-200 wrapper and conveyor drives

Sources: 35-page Wulftec master packet, six-page Siemens parameter record, original conversation snippets and supplied historical summary. The packet retains older appendices whose confidence differs from its summary.

### Identity and parts

- Wulftec International WCRT-200; earlier spoken spelling WRTC-200 remains an alias pending plate comparison.
- Machine/manual references A6882 and Golden State Vintners #6882; manual May 2001. Do not assume every identifier is a manufacturer serial.
- Drawing revision 2000/11/22 reportedly changed conveyor speed from 30 FPM to 36 FPM; drawing fact, not measured speed.
- VFD 7: second outfeed conveyor; original Siemens MICROMASTER Vector; replacement reported as Allen-Bradley PowerFlex 4, catalog 22A-B8P0N104, Series A.
- Replacement rating in packet: 1.5 kW / 2 HP; 200–240 VAC, three-phase input, 48–63 Hz, 9.5 A; output 0–230 VAC, three phase, 0–240 Hz, 8 A continuous / 12 A for 60 seconds. These are drive ratings, not motor overload settings.
- Reference drive photographed with number 6: Siemens 6SE3213-6CA40, 750 W, 208/240 V input, 3.90 A three-phase output. **Not a proven VFD 7 catalog number.**
- PLC: Allen-Bradley SLC 5/03. Second output module, output 4 was reported driving a clicking relay. Exact rack/slot/point/address and relay tag remain open.
- Program filename A6882.ACH; RSLogix/SLC 500 APS and 19,200 serial communications mentioned. Filename is not proof that a current validated PLC backup is included.
- Source feed reported as Panel H2–D4–1P, circuits 14/16/18. Exact hierarchy/meaning of D4–1P needs directory/drawing confirmation.
- Transformer reported 480 V primary, 208Y/120 V secondary. Preserve this intervening voltage-domain information; do not create a direct 480 V connection to a 200–240 V drive.

### Motor records — do not merge

| Motor observation | Recorded values | Issue |
|---|---|---|
| Sterling SH0014PCA | 1 HP, 1750 RPM, 208–230/460 V, 60 Hz, three phase, efficiency 85.5%, code K, SF 1.15 | Associated with second outfeed in later packet |
| Sterling current | User said 3.0/2.9/1.45 A; packet says 3.2/2.9/1.45 A | Preserve 208 V current dispute |
| Adjacent Baldor | 1 HP, 1725 RPM, 3.2 A | Exact plate and load association open |
| Separate 2 HP motor | 230 V, 6.2 A, 1725 RPM, SF 1.15, PF 0.77 | Supplied history; do not assign to Sterling/second outfeed |

### Wiring Set A — attribution disputed

| Siemens terminal | Wire marker | Recorded role |
|---|---|---|
| 2 | 6 | Common |
| 5 | 128 | DIN1 |
| 6 | 129 | DIN2 |
| 19 | 188 | Relay contact |
| 20 | 187 | Relay contact/common |
| A/L1, B/L2, C/L3 | 591, 593, 595 | Incoming phases |
| U, V, W | 592, 594, 596 | Motor conductors |

Master packet PDF pages 12–15 call this **adjacent/reference Drive 6** wiring. Pages 2/5 and the later parameter document call it VFD 7. This is an unresolved conflict within the source collection. Keep all landings together as a reported set with disputed drive ownership. Do not overwrite either drive's canonical terminals from this handoff.

The packet proposes PowerFlex mapping 6→04, 129→02, 128→03, 188→R1, 187→R2. It also discusses SRC and the 01–11 jumper. Those mappings are not independent proof of final installed wiring; the packet's own acceptance tests are unfilled.

### Wiring Set B — separate later readback

Supplied September voice-history record: terminal 1→182; 2→6; 3→183; 4→6; 5→160; 6→161; 7→146; 19→184; 20→180. Incoming markers spoken as 5-6-7, 5-6-9, 5-7-1, often rendered 567/569/571.

Exact drive manufacturer and number are ambiguous. A PowerFlex 4 attribution conflicts with the numbered 19/20 terminal reference. Preserve verbatim as a separate set; do not combine it with Set A or infer a valid PowerFlex terminal map.

### Siemens recorded parameter set

The complete recoverable parameter/value table is supplied in `data/siemens_recorded_parameters.csv` and JSON, extracted from the six-page source PDF. Preserve its asset-attribution caveat and distinguish read-only snapshots from settings. Original source descriptions have not been independently checked against the manual in this task.

Key captured values: P002=1.5; P003=1; P006=2; P007=0; P013=60; P044=56; P046=55; P050=1; P051=P052=18; P061=6; P062=8; P080=.80; P081=60; P082=1725; P083=3.2; P084=230; P085=1; P089=4.6; P134=303; P140–P143=231; P922=2.04; P930=231; P944=0; P971=1.

The PDF records P021=0/P022=60; a later user troubleshooting readback gives P021=4/P022=56/P023=0. Keep separate snapshots with unresolved device/time attribution. Do not decide which is final by numerical plausibility.

### Allen-Bradley readbacks from supplied history

P031 was reported changed from 230 to 208; P032=60; P033 initially displayed 8 A before motor-current correction discussion; P034=60; P036=2; P037=0; P038=1; P039=1; P040=.5; P041=0; P043=0.

A051=4; A052=4; A055=0; A056=0; A067=20; A069=60; A070=0; A071=5; A072=10; A088=230; A089=12; A090=0; A091=4; A092=0; A093=1; A094=0; A095=0; A096=0; A097=1; A098=0; A099=30; A101=0; A102=400; A104=100; A105=0; A106=5; A107=0.

These are mixed historical readbacks, not a verified final export. Do not infer that changing P031 changed A088. Do not copy the 8 A drive rating into motor FLA. Exact parameter semantics require the correct catalog/firmware manual before any operational use.

### Fault and commissioning timeline

- Recurring Siemens F231 reported; historical packet labels it output-current measurement imbalance.
- Reset temporarily cleared faults. PE10 blockage and reset-button chatter correlated with faults on different drives.
- VFD3 identified in history as 2 HP rotary-arm rotation; VFD6 and VFD7 also faulted in distinct observations. PE10 was identified as a stop on first outfeed; PE11 also mentioned.
- VFD7 reportedly faulted with motor leads disconnected. Keep the report and missing exact setup; no bench diagnosis recovered.
- User reported replacing VFD7 with Allen-Bradley, then commissioning direction/speed. Both conveyors were later reported running in the same direction and appearing similar in speed.
- A neighboring drive was observed at 55 Hz and another at 60 Hz. An accompanying explanation based solely on 1725 versus 1750 RPM does not prove actual conveyor speed matching.
- Final motor-current measurements, phase voltages, protective-device details, repeated production cycle count, fault-relay verification and sign-off were not recovered.

Retain photo references IMG_2736(1).jpeg (conveyor controls), IMG_2733.jpeg (PLC input drawing), IMG_2747.jpeg, plus the rendered photographs in the original master packet. Never infer line membership from adjacency or similar drive numbering.

## 8. Industrial Asset Graph product and repository constraints

Historical repository: https://github.com/tobystrings/industrial-asset-graph. Historical Pages URL: https://tobystrings.github.io/industrial-asset-graph/. Neither live source nor deployment was inspected in this retrieval task.

Historical local checkout: `C:\Users\tobys\Downloads\Telegram Desktop\industrial-asset-graph-working`. Branch `codex/facility-dashboard` mentioned. User designated the public site as the baseline on August 19. Inspect current branch/HEAD and repository instructions before applying any older architecture assumption.

- Preserve map-first **strict 2D** presentation; do not reintroduce 3D or placeholder cabinets.
- Facility data separate from reusable core; J. Lieb package under `facilities/lieb-foods`; registry/loader rather than core imports of plant data.
- Historical paths: `src/facility/registry.ts`, `facilities/lieb-foods/index.ts`, `src/facilityData.ts`; `VITE_FACILITY=lieb-foods`. Some were migration targets, not proof of today's implementation.
- Facility-scoped IndexedDB, attachment storage, mutation queues, observations, review/audit; reject cross-facility archive data; keep synthetic facilities free of J. Lieb data.
- Existing concepts include FacilityPackage, VerifiedFact, EvidenceRecord, RelationshipRecord, RevisionRecord, VerificationState and portable `.iag` ZIP backups/import/export.
- Keep verification truth, access scope, and workflow state separate. LOCAL_ONLY evidence must not silently publish or sync. Field observations must not auto-promote to canonical truth.
- Prior goals: administrator/user privileges; individual four-digit PIN identification; in-app add/edit assets, photos, PDFs, relationships and notes; real permission enforcement, not UI-only hiding.
- Map/area editor request August 28: add/delete/merge/split/rename/resize/move/reshape areas; edit walls; annotate/draw/erase/label; multi-select; undo/redo; save/cancel. Preserve asset/evidence references and facility isolation during geometry changes.
- Draft → review → canonical, offline field capture, sync/conflict visibility, search/filtering and evidence-backed dependency tracing are recorded goals. Do not assume all shipped.
- Historical commits mentioned: f19a40d, 0365ac1, b352439; reported tests 42→134. These are recovery leads, not tests run against today's checkout.
- Past deliverables included printable summaries, field packets, cabinet Q&A wizard, checklists, annotated building layouts and cabinet/device drill-down. Review existing implementations before adding competing interfaces.

## 9. Conflict and missing-evidence register

| ID | Issue | Required treatment |
|---|---|---|
| C01 | Drive 6 vs VFD7 ownership of Set A | Retain both source assertions; trace original labels/drawing |
| C02 | Set B drive identity and terminal scheme | Keep separate; recover unambiguous device photograph/readback |
| C03 | Sterling 208 V current 3.0 vs 3.2 A | Read original glare-free plate |
| C04 | Siemens P021/P022 snapshots 0/60 vs 4/56 | Resolve device and chronological context |
| C05 | 480 V upstream vs transformed drive supply | Preserve separate voltage domains; trace transformer |
| C06 | Proposed replacement settings vs actual entries/final export | Keep recommendation/readback/final states distinct |
| C07 | WCRT/WRTC and A6882 identifier meaning | Reconcile machine plate and manual |
| C08 | Kosme L05358 vs older EG05245/05358 references | Prefer OEM registration for documented machine; retain unresolved alternate |
| C09 | CR30 vs index KET39 | Alias at document level; inspect installed hardware |
| C10 | Network address 01 vs physical head 1 | Do not equate without mapping |
| C11 | 25-digit transcript vs five-digit OEM code | Retain discrepancy; do not treat transcript as procedure |
| C12 | Hot-filler corrected drawings vs unaudited HMI topology | Audit source HMI and sheet interfaces before verification |
| C13 | Duplicate FP302; CP301/SRV101/MVP101 unknown | Preserve exact tags and open tasks |
| C14 | Old cabinet placeholders and cooler boundary | Apply later user correction; archive old map as historical |
| C15 | H1/H2/H3 panel ratings lack recovered plates | Mark supplied-history only |
| C16 | Water meter identity and steam estimates | Do not treat makeup/water totals as measured steam |
| C17 | Generated cabinet drawing parts vs original photos | Keep candidate-only until primary evidence recovered |
| C18 | Historical deployment/test claims vs current software | Verify repository state; do not claim tests rerun |
| C19 | Boiler tag vs serial; META serial uncertain | Preserve literal tag and field-verification state |
| C20 | Kosme OEM requirements vs actual plant supply/configuration | Do not infer installed transformer or optional systems |

## 10. Recommended Codex ingestion order

1. Inspect current repository and preserve existing IDs/evidence. Reconcile Line 1/2/4 entities and priorities.
2. Reconcile FG-L4-MTN-001 and L2-CC-001. Add source-linked draft assertions rather than duplicating records.
3. Add the Line 2 hot-filler tag inventory and historical snapshots. Stage ambiguous process edges for review.
4. Add Superior boiler identity/control/blower observations and historical water-treatment event. Keep steam measurement unknown.
5. Reconcile Kosme model/registration, manual coverage, CR27/CR30 source functions and Card 01 observations. Keep line assignment open.
6. Attach Wulftec service history, separate legacy and replacement component instances, and disputed wiring sets. Do not promote disputed electrical edges.
7. Prioritize missing evidence for Lines 2/4 and confirmed shared dependencies. Keep unallocated wrapper/labeler assets visible without guessing a line.
8. Validate idempotent import, missing sources, duplicate IDs, units, observation dates, conflicts, facility isolation and unchanged existing data.

## 11. What this search could not establish

No complete chat export; no complete current inventory; no validated plant-wide one-line or P&ID; no original H1/H2/H3 panel plates; no current complete PLC/HMI backups; no actual line-level throughput/OEE/revenue or downtime totals; no completed boiler steam-consumption audit; no final Kosme repair closure; no unambiguous final VFD7 wiring/parameter commissioning export; no verified equipment allocation for every line.

Unrelated personal, employment/legal, gambling, home electrical, battery-charger and side-job material has been excluded. A recovered 800 A CT-base discussion was not included as a plant asset because plant association was not established.
