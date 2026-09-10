# J. Lieb Foods — Production Line and Co-Packing Reference

Title: J. Lieb Foods — Production Line and Co-Packing Reference
Status: Working reference based on a user-supplied narrative; not an approved process specification or verified equipment inventory.

Evidence rules:
- User-reported means stated in the supplied narrative, not independently verified.
- Verified requires a linked source that supports the specific field, such as a field confirmation, equipment record, drawing, or approved document.
- Unknown values remain null or visibly unspecified.
- Conflicting claims remain visible until resolved; do not silently overwrite existing records.
- Verification applies to individual claims and relationships, not automatically to an entire record.
- Store source, status, and verification metadata using existing project conventions. Do not invent verification dates or reviewers.

Facility scope:
The facility has Line 1, Line 2, and Line 4. This reference details Lines 2 and 4; preserve Line 1 and its existing records. The user identifies Lines 2 and 4 as the principal production lines.

Reported Line 2 configuration:
- Reported container compatibility: glass only; retain as user-reported until confirmed.
- Reported thermal equipment: one heating tunnel, described as a pasteurization/hold tunnel. Exact function and asset identity require confirmation.
- Reported upstream stages: bulk depalletizing, container elevator/lowering stage, inverting air rinser, filler, and capper.
- Reported downstream stages: air knives/drying, accumulation table, bottle coder, labeling or full-body shrink sleeving, case packing, case closing, and case shrink wrapping where applicable.
- Box forming and box coding are supporting case-handling operations; do not put them in the bottle path as if bottles pass through a box former.
- Reported palletizing: manual hand stacking, followed by pallet wrapping at a standalone wrapper.
- Standalone wrapper identity, sharing arrangements, and stretch-versus-shrink method require confirmation.
- Do not characterize manual stacking as a validated inspection for seal integrity or glass defects. Document any actual inspection procedure separately.

Reported Line 4 configuration:
- Reported container compatibility: primarily plastic, including PET/HDPE, with secondary glass capability. Verify compatibility by equipment and format.
- Reported thermal equipment: one cooling tunnel. Its operating profile and asset identity require confirmation.
- Reported upstream stages: bulk depalletizing, container elevator/lowering stage, inverting air rinser, filler, and capper.
- Reported downstream stages: air knives/drying, accumulation table, bottle coder, labeling or full-body shrink sleeving, drop/case packing, case closing, and case shrink wrapping where applicable.
- Box forming and box coding feed the case-handling process.
- Reported palletizing: automated palletizer followed by an inline pallet stretch wrapper.
- Palletizer mechanism, exact machine identities, and actual routing require confirmation.

Routing and shared assets:
The narrative describes common upstream depalletizing/wash resources and some shared end-of-line equipment, but also describes upstream equipment per line. Treat shared ownership, equipment counts, and allocation as unresolved.
Represent the sequences above as reported process stages until their physical assets and exact order are established. Label alternative or optional stages explicitly.
Do not invent physical assets merely to fill a process diagram. A stage may link to an existing asset, reference a documented candidate, or remain unassigned.
A physical shared asset must have one identity with relationships to the lines it serves.

Provisional identifiers from the supplied narrative:
- EQP-TUNNEL-HEAT-01: candidate identifier for the reported Line 2 heating tunnel.
- EQP-TUNNEL-COOL-01: candidate identifier for the reported Line 4 cooling tunnel.
- EQP-PALLETIZER-AUTO-01: candidate identifier for the reported Line 4 automated palletizer.
These are aliases or candidates, not mandatory new IDs. Reconcile against existing records first. Do not enforce facility-wide uniqueness of an equipment type based on this narrative.

Brand and format candidates:
Retain the following as unverified reference candidates, not confirmed customers, active SKUs, compatible line assignments, or approved recipes:
- Stumptown: amber glass stubby, approximately 10.5 oz, crown closure.
- Mamma Chia: clear glass, approximately 10 oz, lug closure.
- Langers: multi-serve plastic/PET, approximately 64 oz or 128 oz.
- Tres Agaves: clear glass, approximately 750 mL or 1 L, screw closure.
Preserve these candidates in the reference documentation or a clearly separated candidate collection; do not seed them as approved production configurations.

Process information requiring authoritative documentation:
The original narrative proposed brand-specific thermal processes, nitrogen use, dissolved-oxygen controls, mixing methods, viscosity handling, pumps, and container-cooling explanations. Those claims are not established by the supplied evidence.
Do not turn the original 180–200 °F range, approximately 100 °F cooling target, or any inferred dwell time into defaults, limits, approved settings, or operator instructions.
Air-rinser ionization, heated-air operation, filler technology, tank jackets, pump types, and palletizer mechanism are also unverified.
Provide fields and document links for approved process requirements when available. Keep equipment applicability, factual verification, and process approval distinct.
This application records settings and process documentation; this task does not authorize PLC, HMI, recipe-download, or machine-control writes.

Changeover and throughput:
Track format-dependent change parts where applicable: starwheels, timing screws, capper chucks, guide rails, neck-handling components, and other documented parts.
Do not assume every asset uses every change-part category.
Support manual and equipment-related production constraints for both lines. Do not claim Line 4 is limited only by filling or packing.
Any throughput calculation must state its units, inputs, source, and assumptions. Leave the bottleneck undetermined when measurements are missing.
