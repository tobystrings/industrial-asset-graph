# Kosme TOP II AD — Authoritative Asset Identity

Evidence source: installed-machine Kosme operator manual, Chapter 2, pages 5–8. Values below are transcribed from the photographed OEM pages. Physical nameplate verification remains required where noted.

## Canonical identity

| Field | Verified value | Evidence/status |
|---|---|---|
| Manufacturer | KOSME S.r.l. Unipersonale | OEM manual/declaration |
| Equipment class | Labelling machine | OEM declaration |
| Full model | `TOP II AD TANDEM 20/1056 CE SA4 E2` | OEM technical specification, page 5 |
| Registration number | `L05358` | OEM technical specification, page 5 |
| Documentation/order code | `K966-749` | OEM manual cover |
| Additional handwritten code | Appears to read `K5001696` | Handwritten on page 5; **unverified transcription** |
| Maximum rated output | 18,000 pieces/hour | OEM technical specification |
| Manual revision marking | `REV. 01 - 06` | OEM manual pages |

## Model-string interpretation supported by the OEM diagram

The page-6 model-identification diagram directly maps parts of the model string:

- `TOP II AD TANDEM` — machine model
- `20` — number of plates
- `SA4` — labelling units designation
- `E2` — applied-labels designation

The meaning of `1056` is not explicitly labelled in the captured diagram and must not yet be assigned a canonical meaning. `CE` identifies the conformity-marked configuration.

## Electrical specifications

| Field | Verified value |
|---|---:|
| Nominal supply voltage | 400 V |
| Supply type | `3×400 N-PE` |
| Auxiliary voltage | 24 V AC |
| Frequency | 60 Hz |
| Rated power capacity | 6.5 kW |

Manual definitions state that `3/N/PE` indicates three-phase power with neutral and protective ground. The photographed specification uses `3×400 N-PE`; field verification against the physical nameplate, disconnect, transformer, and drawings is required before electrical work.

Calculated planning values, not OEM nameplate ratings:

- Ideal balanced three-phase current at power factor and efficiency of 1.0: approximately 9.4 A
- Actual feeder/full-load current must be taken from the physical nameplate, drawings, protective-device settings, and measured conditions; it must not be inferred from 6.5 kW alone.

## Pneumatic specifications

| Field | Verified value |
|---|---:|
| Air consumption | 15 Nl/min |
| Nominal pressure | 6–7 bar |
| Air-treatment unit identified by manual index | SMC `2062455` |

## Environmental specifications

| Field | Verified value |
|---|---:|
| Working temperature | +5 to +50 °C |
| Relative humidity | 30%–90%, non-condensing |
| Installation environment | Suitable covered work environment |
| Explosive atmosphere | Prohibited |
| Direct water/oil/liquid spray risk | Prohibited location |

The manual requires clear, clean, well-lit access; level flooring with adequate loading capacity; sufficient maintenance/removal clearance; and separation from equipment that may cause electrical disturbances.

## Acoustic specifications

| Field | Verified value |
|---|---:|
| Weighted equivalent continuous level at normal load | 68 dB(A) |
| Maximum stated level | 70 dB(C) |
| Measurement position | 1 m from machine outline, 1.60 m above ground |

## Identification-plate location

The manual states that the identification plate is on the side of the machine near the table edge. The illustration places it low on the side/corner of the guarded machine enclosure.

Required field action: photograph the actual plate straight-on at full resolution. Capture model, serial/registration, manufacturing year, voltage, supply configuration, frequency, rated power/current, air pressure and all certification markings.

## Declaration of conformity evidence

The captured declaration identifies:

- Manufacturer: KOSME S.r.l. Unipersonale
- Address: Via dell'Artigianato 5, 46048 Roverbella (Mantova), Italy
- Product description: Labelling machine
- Declaration page revision: `REV. 01 - 06`

Listed directive/standard references include:

- 2006/42/EC Machinery Directive
- 2004/108/EC electromagnetic compatibility
- 2006/95/EC low-voltage directive
- EN ISO 12100-1
- EN ISO 12100-2
- EN ISO 13849-1
- EN ISO 14121-1
- EN 60204-1
- EN 61000-6-2
- EN 61000-6-4

The photographed declaration's model/serial production fields appear unfilled or unreadable. Do not use this generic declaration page alone to prove that the specific installed serial is covered; retain it as OEM package evidence and verify the physical CE plate and any completed certificate.

## Initial Asset Graph nodes and relationships

Create or update these evidence-backed nodes:

- Asset: Kosme TOP II AD Tandem labeler, registration `L05358`
- Document: Operating manual, `K966-749`
- Subsystem: 20-plate rotary machine/carousel
- Subsystem: `SA4` labelling-unit configuration
- Function/configuration: `E2` applied-label designation
- Utility connection: 400 V, 60 Hz, three-phase with N/PE as documented
- Control power: 24 V AC auxiliary supply
- Utility connection: compressed air, 6–7 bar, 15 Nl/min
- Component: SMC `2062455` air-treatment unit
- Compliance document: declaration of conformity, photographed page 8

Relationships:

- Labeler `HAS_DOCUMENT` operating manual `K966-749`
- Labeler `HAS_REGISTRATION_NUMBER` `L05358`
- Labeler `REQUIRES_ELECTRICAL_SUPPLY` documented 400 V/60 Hz configuration
- Labeler `REQUIRES_COMPRESSED_AIR` 6–7 bar / 15 Nl/min
- Labeler `HAS_SUBSYSTEM` 20-plate rotary assembly
- Labeler `HAS_COMPONENT` SMC `2062455` air-treatment unit
- Operating manual `IS_SOURCE_FOR` technical specifications and maintenance procedures

## Open verification items

- Physical nameplate photograph and manufacturing year
- Confirmation of handwritten code `K5001696`
- Exact meaning of `1056`
- Expanded definitions and physical inventory of `SA4` and `E2`
- Actual feeder, disconnect, overcurrent protection, conductor size and measured load
- Control transformer/power-supply identification for 24 V AC
- Air connection, regulator setting, filter condition and measured pressure under production load
- Exact relationship between this TOP II AD manual and the separate Sensicol maintenance-plan binder
