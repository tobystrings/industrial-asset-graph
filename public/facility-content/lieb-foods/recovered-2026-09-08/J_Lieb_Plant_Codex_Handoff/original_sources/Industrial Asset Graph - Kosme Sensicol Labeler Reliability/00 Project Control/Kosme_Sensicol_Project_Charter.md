# Industrial Asset Graph — Kosme Sensicol Labeler Reliability

## Mission

Restore dependable production performance on the Krones/Kosme Sensicol labeler, identify and eliminate recurring root causes, and convert every verified finding into a durable maintenance and troubleshooting system inside the Industrial Asset Graph.

This is not a one-time repair record. It is both an immediate production-recovery project and a long-term maintenance-engine implementation.

## Machine identity currently supported by evidence

- Manufacturer family shown: Krones / Kosme
- Equipment name shown: Sensicol labeler
- Source document shown: Maintenance Plan
- Document date shown: 05/04/2015
- Revision shown: 00
- Exact model, serial number, plant asset ID, line, electrical drawings, software versions, and installed configuration: not yet verified

## Required outcomes

1. Safely contain the current production problem.
2. Capture repeatable symptoms, operating conditions, alarms, settings, and physical evidence.
3. Build and execute an evidence-based fault tree.
4. Identify root cause instead of repeating temporary adjustments.
5. Verify the corrective action under representative production conditions.
6. Record verified known-good settings by product and SKU where applicable.
7. Build the machine hierarchy and relationships in the Industrial Asset Graph.
8. Convert OEM requirements and plant experience into PM, inspection, lubrication, calibration, troubleshooting, and spare-parts programs.
9. Track downtime, service calls, parts, labor, production impact, recurrence, and avoided cost.
10. Preserve the knowledge needed for plant maintenance to diagnose future faults without unnecessary outside service calls.

## Project structure

- `00 Project Control` — charter, scope, status, decisions, risks, approvals, and change log
- `01 OEM Documentation` — manuals, maintenance plans, drawings, parts lists, bulletins, and vendor literature
- `02 Asset Intake` — nameplates, installed configuration, subsystem inventory, tags, I/O, network, software, and baseline data
- `03 Live Troubleshooting` — symptoms, fault trees, measurements, tests, results, containment, root cause, and verification
- `04 Maintenance Engine` — PM tasks, inspection routes, lubrication, calibration, condition monitoring, procedures, and spares
- `05 Service History and Cost` — work orders, invoices, vendor reports, downtime, parts, labor, recurrence, and savings
- `06 Photos and Evidence` — original photos, videos, screenshots, annotated evidence, and before/after records
- `07 RTK Graphify Token Governance` — tool verification, configurations, reports, exceptions, audit results, and governance evidence

## Industrial Asset Graph model

The machine will be represented as connected assets rather than a flat equipment note. Expected entities include the labeler, labeling stations, web path, reels, peel plates, applicators, bottle handling, infeed and discharge conveyors, screws, starwheels, guides, carousel, motors, gearboxes, drives, encoders, sensors, pneumatic equipment, safety devices, PLC, HMI, remote I/O, networks, power supplies, disconnects, panels, drawings, procedures, alarms, failure modes, PM tasks, parts, work orders, vendors, products, SKUs, settings, and evidence.

Every relationship must be evidence-backed and carry source/provenance. Guesses must be marked unverified and may not silently become canonical asset data.

## Diagnostic record standard

Every troubleshooting case must follow:

`Symptom → operating state → affected subsystem → candidate cause → safe test → expected result → observed measurement → evidence → conclusion → corrective action → production verification → prevention`

No adjustment is considered a root-cause correction until the change, result, and production verification are recorded.

## RTK requirement

Rust Token Killer (RTK) must be used for supported high-output shell operations when it provides a safe, transparent reduction in tool output. Typical candidates include Git status/diff/log operations, tests, package-manager output, file discovery, and other supported commands.

RTK must never change the technical meaning of a test, hide required evidence, or replace review of full output when full output is needed. Each milestone closeout must record whether RTK was available, where it was used, exceptions, and its reported savings. RTK savings are operational estimates; OpenAI usage reporting remains authoritative for billed usage.

## Graphify requirement

Graphify must be integrated when repository and code-relationship context is useful, especially before broad code searches, dependency-impact analysis, schema changes, and implementation planning. Its presence must be verified in the actual execution path used by the project.

A registered hook or global installation alone is not proof that Graphify affected a specific run. Milestone evidence must record whether it ran, what context it supplied, and any bypass or unsupported execution path.

Graphify-derived relationships are developer-navigation evidence, not automatic truth about the physical machine. Physical asset relationships still require OEM, field, drawing, control, or measurement evidence.

## Token Manager / Codex Governor policy

The project is fail-safe by default:

- Default governed profile: Luna / SAFE
- Reasoning: low unless the task justifies escalation
- Fast mode: off
- Approval policy: on-request
- Sandbox: workspace-write
- Terra: explicit escalation for tasks that justify it
- Sol: explicit human-approved escalation only; never selected automatically
- Automatic routing may choose Luna or Terra but must never choose Sol
- Inspection work should use the read-only inspection path where available

Expected local Governor root: `C:\Users\tobys\AppData\Local\CodexGovernor`

Expected components include `cg.ps1`, `cg.cmd`, `settings.json`, `ledger.csv`, and `backups\`. The native Codex configuration is expected at `$env:USERPROFILE\.codex\config.toml`.

Expected commands include `cg`, `cg route`, `cg auto`, `cg run luna`, `cg run terra`, `cg run sol`, `cg inspect`, and `cg report`.

The ledger must record only observable governed runs. Local governance must never imply control over execution paths it cannot observe or hard-govern. Codex Desktop, IDE, cloud, or delegated execution paths require separate verification and visible limitation reporting.

## Governance status at project creation

Status: **NOT YET CONFIRMED FOR THIS PROJECT**

Known prior evidence indicates RTK and Graphify were installed and a Governor repair was designed. However, prior records do not conclusively prove that Graphify ran through every relevant execution path or that the final Token Manager/Governor repair passed its complete fresh-PowerShell and cross-path verification matrix. One earlier captured configuration also conflicted with the required Luna default.

Therefore, this project may not claim that RTK, Graphify, or the Token Manager is fully implemented until the project-specific acceptance checklist passes with captured evidence.

## Mandatory gates

- No real production change without safe work controls, authorization, and rollback/restore planning appropriate to the change.
- No canonical asset relationship without source evidence.
- No root-cause claim without test evidence and production verification.
- No milestone completion while governance acceptance items remain falsely reported as passed.
- No Terra or Sol escalation without recording why Luna was insufficient.
- No claim that local token governance controls Desktop, IDE, cloud, or delegated work unless that exact path has been tested and proven.

## Initial intake required

- Full maintenance-plan binder or PDF
- Machine and cabinet nameplates
- Plant asset ID and exact line/location
- HMI overview, alarm history, diagnostics, software/version screens
- Electrical, pneumatic, controls, and mechanical drawings
- Photos of the full machine and every installed subsystem
- Exact current failure symptoms and conditions
- Product/SKU dependence and known-good versus failing runs
- Operator and maintenance observations
- Recent work orders, service reports, invoices, parts, and technician actions
- Current settings before any adjustment

## First project milestone

Milestone 0 is documentation and governance readiness only: verify the repository/workspace, preserve the starting state, confirm RTK, Graphify, and Token Manager behavior on the exact execution paths to be used, inventory available evidence, establish the initial asset identity, and produce a gap report. It must not change production equipment or invent missing machine data.
