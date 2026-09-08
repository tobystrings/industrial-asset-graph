# Krones/Kosme Sensicol Publication Search Findings

Search date: 2026-09-02

Target visible on plant binder:

- Header: `KRONES`
- Field: `Publication # Labeler`
- Title: `KOSME SENSICOL MAINTENANCE PLAN`
- Date: `05/04/2015`
- Revision: `00`

## Result

No publicly indexed exact copy was found that matches the complete target cover, date, and revision. The visible phrase `Publication # Labeler` does not contain a unique publication number and appears likely to be a generic or customer-specific binder field. Date interpretation is also ambiguous between May 4 and April 5, although neither US nor European exact-date searches produced the target publication.

The strongest available evidence indicates that detailed Kosme documentation is machine-specific. Exact retrieval therefore requires the machine nameplate identity—especially model, code, serial number, and manufacturing year—or another inside-page document code.

## New installed-document identification

A second plant photograph identifies an operating-manual package as:

- Machine/document family: `TOP II AD`
- Title: `Operating manual of the machine`
- Kosme code/serial: `L05358`
- Additional documentation/order code: `K966-749`

This is substantially stronger identification than the maintenance-plan cover. Exact public searches for `TOP II AD`, `L05358`, `K966-749`, and the combined identifiers produced no indexed copy of this machine-specific manual.

`TOP II` is a documented Kosme labeler family. Public listings show other TOP II configurations such as `TOP II HM 16/720 SH1 E1`, where `HM` denotes a hot-melt configuration. The plant document's `AD` designation is consistent with an adhesive/self-adhesive configuration, but that decoding remains **provisional until confirmed inside the manual or on the machine nameplate**.

The earlier `KOSME SENSICOL MAINTENANCE PLAN` binder and this `TOP II AD` operating manual must remain separate document entities. They may both apply to the same installed labeler or one may cover a labeling subsystem/service program, but the photographs alone do not prove that relationship.

Classification: **TOP II AD identity verified from plant documentation; exact installed configuration and relationship to the Sensicol maintenance plan remain open.**

## High-value related documents found

### 1. Sensicol operator/use manual — 134 pages

Public listing: https://es.scribd.com/document/793869704/sensicol-8960-sa3-e3

Verified contents include:

- Technical characteristics and machine identification
- Electrical and pneumatic guidance
- Operating principles and format changes
- Cleaning and maintenance program
- Maintenance-point list
- Lubrication instructions, lubricant table, and lubrication schedule

This manual identifies a different machine:

- Model: `SENSICOL 8/960 Sa3 E3`
- Serial/machine number: `L05611`
- Maximum production: 3,000 pieces/hour
- Electrical supply: 3x440-GND, 50 Hz, TN-S
- Installed power: 8 kW
- Nominal air pressure: 6–7 bar

Classification: **Useful family reference; not verified for the plant machine.** It must not be used as authoritative machine-specific instruction until the plant nameplate and configuration are compared.

### 2. Flexa Sensicol use manual — machine/document trail L05902 / K966I70

Public listing: https://www.scribd.com/document/946262809/02-l05902-manual-de-Uso-Maquina-es

Document markings:

- `FLEXA SENSICOL`
- `L05902`
- `K966I70`
- Spanish translation of the original Italian manual

Classification: **Related machine-specific manual; not the target publication unless the plant machine carries matching identifiers.**

### 3. M100 applicator and pre-unwinder manual — L05902 / K966I70

Public listing: https://es.scribd.com/document/946261739/03-l05902-conjunto-m100-Con-Predesbobinador-es

Classification: **Potential subsystem reference only.** Applicability depends on whether the plant labeler has the same M100/pre-unwinder equipment and matching machine identifiers.

### 4. Kosme Flexa Sensicol product presentation

Official product page: https://www.kosme.com/en/products/flexa-sensicol.php

Alternate indexed brochure: https://images.bid-on-equipment.com/prod-documents/3205-KOSMEFlexaSensicolBottleLabeler-0.pdf

Classification: **Official/general product-family information; not a maintenance plan.**

### 5. Krones.shop manual item 0905299675

Official product listing: https://shop.krones.com/shop/us/en/Kosme/Others/Manual/p/0905299675

The public page identifies the item only as a Kosme manual and does not expose enough metadata to connect it to the target cover.

Classification: **Unresolved lead.** Do not assume it is the Sensicol maintenance plan without confirmation from Krones or an authenticated machine-specific account.

## Official exact-document recovery path

Krones states that a registered Krones.shop profile is tailored to the customer's machinery and linked to Krones eCat, including personal machine documentation and parts lists:

https://shop.krones.com/shop/us/en

Krones technical support is the official central contact for machine and line questions:

https://www.krones.com/en/products/service/support.php

## Required identification before requesting the exact publication

Photograph or transcribe the complete Kosme/Krones machine nameplate:

- Model
- Code
- Serial number / matricola
- Manufacturing year
- Total weight
- Required power
- Voltage and frequency
- Air pressure
- Any plant asset number

Also photograph:

- Binder spine and back cover
- Table of contents
- First page after the cover
- Footer/header codes on several maintenance-plan pages
- Any CD/DVD labels, drawing indexes, document indexes, or Krones order/project numbers

## Exact request to Krones/Kosme

Request the complete original machine documentation package tied to the machine serial number, specifically:

- `KOSME SENSICOL Maintenance Plan`, dated `05/04/2015`, Revision `00`
- Operator/use manual
- Cleaning and maintenance schedule
- Maintenance-point list
- Lubrication plan and approved lubricant table
- Electrical drawings
- Pneumatic drawings
- Mechanical assembly drawings
- Spare/wear-parts catalog
- Labeling-unit manuals
- PLC/HMI/drive documentation and backups where available
- Original document index and all later revisions or service bulletins

## Asset Graph handling rule

The public manuals may be indexed as external reference documents with `applicability = unverified`. Only the plant binder, matching machine identifiers, or manufacturer confirmation may promote a document to `authoritative-for-installed-asset`.
