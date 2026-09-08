# Kosme TOP II AD — Electronic Cam Card Fault Diagnostic

## Source and immediate conclusion

OEM Operator Manual, Chapter 7, captured pages 76–80, revision `REV. 01-06`. Page 75 is now captured separately, making pages 65–80 continuous.

The card/HMI problem must be treated as a **network, power, addressing, communication, source-program, or board fault** until testing identifies the failed element. OEM error `27 COM. ERROR` does not by itself prove that the newly installed electronic-cam card is defective.

## Card data available from the CR30 display

Hold the confirmation/enter key for about three seconds to open card-data readout. Use the left/right keys to select a parameter. Hold F2 and use up/down to select the card.

| Code | OEM meaning | Diagnostic value |
|---|---|---|
| `En` | Selected head position in machine degrees | Confirms card/head position awareness |
| `Tc` | Output per hour for each head; displayed value ×10 | Confirms activity/production indication |
| `Pc` | Instruction pointer incremented for each cam command | Shows whether the board program is executing |
| `Nc` | Last analog value read from motor-pitch photocell | Checks centering sensor input |
| `Tp` | Selected-card temperature | Detects board or probe overtemperature |
| `Sx` | AUX1, AUX2 and digital-signal states | Input diagnostic |
| `Ve` | Firmware version; displayed `10` means version `1.0` | Detects mismatched firmware among cards |
| `Se` | For selected card 0, input-signal status to CR30 | CR30 input diagnostic |

These values should be recorded for every card before another replacement or network-wide program copy.

## OEM first-installation behavior

At first power-up, holding the confirmation/enter key enters configuration for:

- Language
- Number of platforms/heads
- Machine serial number

The platform count and serial number must match the values programmed on every electronic cam. After the serial number is entered, CR30 resets, communicates with all online cams, and checks whether they contain the same program. It then sends the last active cam format and parameters. `RUN` remains until first machine-zero achievement; `READY` indicates the system is ready.

For this machine:

- Documented platform/head count: 20
- Registration/serial identifier: L05358
- The manual requires a five-digit access code of `0 + machine serial number`; the handwritten note on page 78 shows `05358`.

The code must be verified on the actual display before use; the leading `L` is not shown in the five-digit manual example.

## OEM replacement and cloning sequence

1. Switch off and isolate the machine according to plant LOTO and the OEM safety warning.
2. Remove guards only after power is cut and the required waiting period is observed.
3. Disconnect the card connectors and replace the card.
4. Restore guards/safety conditions before powered testing.
5. Set the replacement card's network address with its DIP switches.
6. On power-up, enter the five-digit machine code when requested.
7. Select a **known-good online card address other than the replacement card** as the program source.
8. Allow the decrementing copy counter to reach zero without interrupting power or communication.
9. Confirm startup progresses from `RUN` to `READY` after machine zero is achieved.

Critical control point: choosing the replacement card, an incorrectly addressed card, or a board with corrupted/incompatible program data as the copy source can invalidate the recovery. Record the source address and replacement address.

## Network-wide copy behavior

The separate program-copy procedure reads one selected card and transfers its program to all other online electronic cams. It requests:

- Language
- Head quantity
- Machine serial/code
- Source-card address

Because this is a network-wide write, do not repeat it until the source board is proven good, addresses are unique, power/communications are stable, and current card data/firmware have been recorded.

## Error-message fault tree

### Error 24 — SOFTWARE ERROR

Raised by a programmed `set alarm` command. Follow format-specific technician instructions. If the command was not used, the message should not appear.

### Error 25 — HARDWARE ERROR

The board's self-protection activated from an internal or external cause.

OEM checks:

- Reset using the CR30 enter key.
- Inspect the board-to-motor cable for damaged insulation.
- Inspect/remove metal particles inside the board.
- If unresolved, replace the control board and set the replacement's network address.

### Error 26 — HIGH TEMPERATURE

Board maximum operating temperature exceeded, approximately 85 °C.

- Use CR30 to determine whether one board or all boards report high temperature.
- One-board high reading can indicate a defective temperature probe.
- All-board/general high temperature points toward cabinet/head ventilation and environmental heat.

### Error 27 — COM. ERROR

CR30 cannot communicate with one or more boards.

If one board reports the error:

1. Verify power reaches that board.
2. Inspect power cable for interruption/tearing.
3. Verify connector insertion and cable-screw tightness.
4. Inspect the flat signal cable.
5. Replace the board only if the problem remains after these checks.

If all boards report the error:

1. Verify power reaches the boards; confirm plates are coupled and centering photocells are on as applicable.
2. Check the board-supply circuit breaker.
3. Verify head safety switches are properly closed.
4. Verify CR30-to-head connections, including sliding contacts.
5. Inspect the network flat cable for tearing or poor connections.
6. Disconnect the flat cable from all boards except one; test communication.
7. Add boards back individually to identify the board that prevents the others from communicating.
8. Replace the identified blocking board.
9. If the cause is still not found, the OEM directs replacement of `CR23/I` and `CR30` boards.

This OEM isolation sequence is the strongest current diagnostic path. A single defective, misaddressed, unpowered, or shorting board may disrupt communication for the entire chain.

### Error 28 — FAULTY LINE

The message is present in CR30 but is documented as inactive.

## Controlled field test sheet

Record these values before testing:

| Field | Record |
|---|---|
| Exact HMI/CR30 error number and text | |
| Error affects one board or all boards | |
| Replacement-card address/DIP pattern | |
| Addresses of every other board | |
| Program source address used for cloning | |
| Head quantity entered | |
| Machine code entered | |
| Copy counter reached zero | Yes / No |
| Startup reached RUN | Yes / No |
| Machine zero achieved | Yes / No |
| Startup reached READY | Yes / No |
| Board-supply voltage at each board | |
| Breaker/safety-switch state | |
| Sliding-contact condition | |
| Flat-cable visual/continuity findings | |
| `Ve` firmware for each card | |
| `Tp` temperature for each card | |
| `Pc` changes during operation | |
| Board-by-board isolation result | |

## Recommended diagnostic order

1. Preserve the exact error and current configuration before resetting.
2. Determine one-board versus all-board communication failure.
3. Verify board power, breaker, safety chain, connectors, sliding contacts and flat cable.
4. Check for duplicate/mistyped DIP-switch addresses.
5. Read and compare `Ve`, `Tp`, `Pc`, `Sx`, and other card data.
6. Isolate the communication chain to one board, then add boards individually.
7. Only after the network and addressing are proven should the program be recopied from a verified known-good source.
8. Replace additional hardware only after the OEM isolation steps identify it or all preceding checks pass.

## Safety boundary

The manual warns that removing protections exposes dangerous voltages. Qualified personnel must cut power, wait at least one minute, reinstall all protections, and ensure the related safety switches are seated before resetting. Plant LOTO procedures and applicable electrical-safety practices control the work.

## Linked page-75 controls

Page 75 confirms that empty-plate rotation is an explicit CR30 test mode and that per-platform centering compensation `Cp` is distinct from common `R1`. Those settings can affect plate behavior or alignment but do not replace the error-27 communication checks in this diagnostic.

## Graphify/Token Manager treatment

- Model each cam board as a separate addressable component with DIP address, firmware, temperature, card data and communication state.
- Model CR30, CR23/I, flat cable, power circuit, safety switches, sliding contacts and photocells as separate nodes.
- Store every replacement and copy operation as an event with source address, target address, code, result and technician.
- Treat error 27 as a communication-fault event linked to all candidate causes, not as proof of card failure.
- RTK/Token Manager should retrieve this diagnostic record and only the specific OEM page required for the active test.
