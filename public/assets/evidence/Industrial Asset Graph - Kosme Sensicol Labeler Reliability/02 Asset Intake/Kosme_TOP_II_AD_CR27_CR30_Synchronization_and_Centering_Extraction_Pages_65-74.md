# Kosme TOP II AD — CR27/CR30 Synchronization and Centering Extraction

## Source scope

OEM Operator Manual, Chapter 7, pages 65–74, revision marking `REV. 01-06`.

This batch identifies two distinct devices/functions:

- `CR27` — platform synchronizer for plate-specific label-start compensation.
- `CR30` — electronic-cam display/controller interface for active cams and centering parameters.

The index calls section 7.10 `KET39 - ELECTRONIC CAM DISPLAY`, while the direct photographed page-69 heading reads `CR30 - ELECTRONIC CAM DISPLAY`. Preserve `KET39` as an OEM index alias and use `CR30` as the page-level device identifier until the physical hardware label resolves the discrepancy.

## CR27 functional relationship

The CR27 sits between the jack/start photocell and the start input of the self-adhesive labeling-group instruments. It generates group-start commands and compensates for mechanical differences among plates.

Required signals:

- Encoder signal shared with the adhesive/self-adhesive groups.
- Start-photocell signal.
- Machine zero signal used for plate numbering.

Critical topology:

`Start photocell → CR27 → adhesive-group start input`

The OEM specifically states that the start-photocell signal must not go directly to the adhesive groups. The CR27 and adhesive-group instruments must share the supply negative/common.

## CR27 terminal map

| Terminal | Function | Source |
|---:|---|---|
| 1 | +12 VDC | Page 65 |
| 2 | Negative/common | Page 65 |
| 3 | Encoder input | Page 65 |
| 4 | Start-photocell input | Page 65 |
| 5 | Zero-sensor input | Page 65 |
| 6–7 | Not assigned on captured table | Page 65 |
| 8 | Group-start output | Page 65 |
| 9 | Jack-opening output | Page 65 |
| 10–12 | Not assigned on captured table | Page 65 |

The jack-opening output is described as active with the contact not closed when the CR27 sees the first zero signal.

## Zero-sensor sequence

The zero sensor establishes plate 1. The OEM sequence is:

1. Last plate activates the start photocell.
2. Zero sensor activates.
3. Plate 1 activates the start photocell.

If CR27 does not see the zero signal after startup or because of a malfunction, it continues generating starts but assigns every plate the same delay: the average of all programmed plate delays. This is a high-value diagnostic clue because the machine may still run while plate-specific label placement becomes inconsistent.

## CR27 parameters

| Parameter | Meaning | Range/behavior |
|---|---|---|
| `Fo` | Bottle size/format and associated plate-delay set | Maximum size count = `int(500 / head count)`; numbering begins at 0 |
| `Pi` | Plate selected for delay adjustment | Plate numbers 1, 2, … |
| `th` | Number of machine heads/plates | 1–64; expected candidate for this machine is 20, but display must be verified |
| `Pt` | Encoder pulses per machine revolution | 256–65535 |

For installation on an already tested machine, the manual says the global `bP` parameter of each adhesive group must be reduced by 100 units/encoder pulses. This is an OEM instruction but should not be changed again until current values and the actual configuration are recorded.

## CR27 plate-delay programming behavior

- Plate 1 is the reference plate.
- Each subsequent plate can receive an individual delay correction through `Pi`.
- Increasing delay starts the label in advance according to the manual wording.
- Exiting `Pi` by holding the P button for about three seconds permanently stores programmed delays.
- If power is removed while still in `Pi`, uncommitted changes are lost.

## CR30 electronic-cam interface

### Key functions

| Key | Function |
|---|---|
| F1 | Active-cam programming |
| F2 | Centering-parameter programming |
| F6 | Enable rotation of empty plates |
| Enter/return | Confirm parameter; access test |
| Up/down | Increase/decrease value |
| Left/right | Shift/select |

### Terminal board

| Terminal | Function |
|---:|---|
| 1 | +24 VDC |
| 2 | Negative/common |
| 3 | AUX_1 input |
| 4 | AUX_2 input |
| 5 | AUX_3 input |
| 6 | Unassigned in captured table |
| 7 | Lever-opening output |
| 8 | Unassigned in captured table |
| 9 | Synchronism input |
| 10–11 | Unassigned in captured table |
| 12 | Machine run-enable output |
| 13 | Unassigned in captured table |
| 14 | Net signal |

The drawing also shows a communications connector. Its protocol and pinout are not established by these pages.

## Cam and centering parameters

| Parameter | OEM meaning |
|---|---|
| Cam number | Unique number 0–99; cam name is descriptive and is not unique |
| `R1` | Lag/stop position at end of centering, in platform-revolution degrees |
| `Fu` | Centering operation mode: manual (`Man`) or automatic (`Auto`) |
| `Me` | Recognition reference: center or edge of detected spot |
| `Mp` | Multiplier: `SL × 1` or `SL × 4`; relevant to manual-mode spot-length range |
| `Sp` | Spot polarity: dark or light relative to background |
| `SL` | Minimum physical spot length to recognize, in bottle-revolution degrees |
| `Sr` | Measured spot-length readout |
| `Sg` | Measured threshold readout |

In manual centering, the sensor supplies a digital signal and `SL` decides whether a sensed spot is valid. In automatic centering, the driver receives an analog sensor signal and uses a recognition algorithm based on `SL` and `Sp`; the manual states that sensor adjustment is not required in this mode.

Page 73 contains an apparent instruction inconsistency: the `Sp` programming steps say select `Man-Auto`, while page 74 defines `Sp` as `Dark` or `Light`. Treat page 74's parameter definition as the clearer description, but verify the actual display before changing the setting.

## Immediate diagnostic implications

For recurring label-position or electronic-cam faults, inspect and record before changing parameters:

1. CR27 display during operation: active `Fo` and advancing plate number.
2. Whether the plate number resets correctly at plate 1.
3. CR27 terminals 1/2 supply, zero input 5, start-photo input 4, encoder input 3, and group-start output 8.
4. Shared negative/common between CR27 and label-group instruments.
5. Actual `th`, `Pt`, `Fo`, and every `Pi` value.
6. CR30 cam number/name and `R1`, `Fu`, `Me`, `Mp`, `Sp`, `SL`, `Sr`, and `Sg` values.
7. CR30 +24 V supply, synchronism input, run-enable output, net signal, and communications connector condition.
8. Exact HMI fault text, when it occurs, and whether it follows power-up, format selection, program copy, or machine run.

## Page 75 continuation — empty-plate rotation and centering compensation

Page 75 is now captured and closes the Chapter 7 sequence.

- `Sr` is a readout of the sensed spot dimension and is used as a guide for setting `SL`.
- `Sg` is a readout of the spot-recognition threshold programmed by the card.
- Pressing F6 and F1 together accesses the `NET1–NET2–NET3` test setting. Enabling `On` under `NET1` permits plates to rotate without bottles. A machine power cycle returns the function to its initial condition.
- Final centering position is the sum of common lead parameter `R1` and plate-specific compensation `Cp`.
- `R1` is common to every platform; `Cp` can differ by platform to correct small mechanical differences.
- `Cp` range is −11.2° to +11.2°.
- Manual `Cp` entry can be performed while the machine is running; copying compensation from another size requires the machine to be stopped.

Empty-plate rotation is a controlled test mode, not evidence that normal product detection is working. Record its state before and after diagnostics.

## Limits and linked continuation

Pages 65–75 do not themselves contain the electronic-cam-card installation, replacement, program-copy, DIP-switch, or error-message procedures. Those are captured in pages 76–80 and extracted into the separate electronic-cam-card fault diagnostic. Card replacement, cloning and DIP-switch work must use both records together with verified field data.

## Graphify and token-control mapping

- Create separate `CR27` and `CR30` component nodes; do not merge them.
- Model signal paths as directed relationships with terminal provenance.
- Store parameters as time-stamped configuration observations, not timeless facts.
- Associate every parameter change with format, operator/technician, reason, prior value, new value, and outcome.
- RTK/Token Manager should retrieve this compact extraction first, then load only the relevant OEM photograph for visual confirmation.
