# Climax drop packer — source review

Draft—requires machine-side validation

Machine identity and Line 2 assignment were supplied in the owner brief. Installed serial number and floor position are unverified. The saved project association needs confirmation at the machine.

## Sources

Original ACD: `Portland_Brewing_6759_15Sept2026.ACD` · SHA-256 `e2cf57f636927a0b6c2e8c6ee0d44f9a13432deda6a0e989be64acf37e51df57`. Desktop and D: copies match. Original preserved.

QuickInfo.XML was independently extracted from the original archive; it establishes saved project metadata only: Portland_Brewing_6759, revision 30.14, RSLogix 5000 v30.02. No online controller comparison was performed.

- Project_Breakdown.md: SHA-256 `a1fe23de0c124e99bf18e86d8731488cf5eb0348b566dd58705e04a1ab971031`
- Recovered_Ladder.txt: SHA-256 `e57fb5d2f4b6caaa0267b0a3152e488c07f4e0e99c82cf9560881a72d6d8ddbb`
- Tag_Inventory.txt: SHA-256 `5d8c0bad7f814f3b8c7a287edd9207ac645c63ee6c7e67ca95a23ada5f77c24f`

## Limits

Recovered records are preliminary binary recovery, may include historical material, and have unverified routine ownership and execution order. Numbers below are extraction records, never Studio 5000 rung numbers. Commands do not prove physical movement or clearance. No live telemetry connection exists. HMI labels, axis units, safe directions, wiring, retained-state behavior and installed firmware remain unverified.

## Required validation

Export the complete controller as L5X or L5K from the applicable saved project, including all programs/routines, controller and program tags with values/aliases, module configuration, motion groups, axes, coordinate systems and motion profiles. Supply installed-project comparison, HMI application/export, electrical and pneumatic drawings, matching OEM manuals, and site-approved recovery/isolation procedures with revisions. Confirm controller/drive nameplates and firmware before using any manufacturer recovery instructions.

## Saved-logic interpretation


Recovered subroutine calls reference:
- Vert_and_Horiz_Axis
- Diagnostics
- Bottle_Conv
- Case_Conv
- Setup_Parameters

MainProgram and MainRoutine names are present. Recovered record order must not be treated as validated routine execution order.

## Packing cycle â€” interpretation from recovered logic and comments
1. Accumulate bottles and establish bottles-ready conditions.
2. Move to the bottle pickup position.
3. Grip bottles and raise to a holding position.
4. Move horizontally toward the pack position and lower to place bottles in cases.
5. Release bottles, raise the mechanism, and return horizontally.
6. Index cases for the next cycle.

Motion uses Dual_Axis_Move and MCLM instructions with Position_Array entries 0, 2, 4, 6, 8, and 10. State variables include Step, Step_1, and Step_2. Individual moves advance through state values such as 0, 10, 20, and 30. Exact positions, units, complete call ordering, and active saved parameter values need a native export for confirmation.

## Specific behavior recovered
### Automatic homing
The auto-home latch includes MCR_Delay.DN, no active Cycle_Start, air pressure OK, and vertical rod-lock release. It triggers vertical homing first. The horizontal-home pulse depends on vertical position at or below 3 and vertical homing status bits. Completion requires both axes' homing status signals plus each actual position at or below 1. These numeric thresholds are in the configured axis units, which have not been established here.

### Semi-automatic packing
Semi_Auto_Pack_Active requires no active Cycle_Start, MCR_Delay.DN, air pressure, Bottle_Pickup_Memory, and the HMI request or its own latch, while completion is false. A one-shot moves Step to 20. Completion is set when the semi-auto latch is true and Step_2 equals 10.

### Mode/bypass path worth tracing
Recovered rung: XIC(BYPASS_TAG)OTE(PICK_N_PLACE_BYPASS);
The comments associate BYPASS_TAG with Local:2:I.Data.11 and an AUTO/MANUAL selector at the HMI panel. A nearby comment states 0=AUTO and 1=MANUAL. The actual alias/wiring association needs verification; comments alone do not prove wiring.
PICK_N_PLACE_BYPASS appears in basket, case-stop, case-index, counter-reset, and clamp logic. It is therefore a meaningful machine-mode input, not merely a display label. No assertion is made that this bypass is active now.

### Diagnostics
Recovered diagnostic records write numeric codes to Local_Message_Display, including:
- 1, 2, 3: respective E-stop input conditions.
- 5: master-control-relay condition.
- 25, 26: respective axis-not-homed conditions.
- 27, 28: bottle/case conveyor not running.
- 30: air-pressure condition.
- 52: vertical rod-lock release condition.
These are interpretations of the tests in the recovered records, not verified HMI alarm text or a complete alarm-priority map.

### Recipes
Tags contain Bottle_1 through Bottle_10 parameter families for positions, conveyor speeds, gripper timings, case quantities, and delays. This indicates ten recipe parameter families; it does not establish ten bottles per case or that all recipes are enabled.

## Extraction limits
The ACD was read locally and left unchanged. Archive extraction followed the structure documented by https://github.com/hutcheb/acd . A local exploratory script recovered 263 ladder-text records and mapped their @hex@ references using component headers. Module references in &hex form and timer placeholders remain in places. Deleted/historical records, record ordering, and routine ownership have not been fully validated. These files are analysis aids, not an importable or deployable PLC program, and do not establish current machine status. A native Studio 5000 L5X/L5K export would allow a more authoritative rung-by-rung review.



## Supporting recovered records

### Extraction record 1

```text
XIC(MCR_Delay.DN)XIC(Air_Pressure_OK_PS1)XIO(&4a46a850:I.Faulted)XIO(Panelview_PB[1])[XIC(Panelview_PB[0]) ,XIC(Bottle_Conv_Run) ][OTE(Bottle_Conv_Run) ,OTE(Bottle_Feed_Conveyor) ];
```

### Extraction record 4

```text
XIC(Panelview_PB[5])XIC(&4a46a850:I.Faulted)OTE(&4a46a850:O.ClearFaults);
```

### Extraction record 29

```text
XIC(Case_Conv_Run)[TON(Case_Conv_Start_Timer,?,?) ,XIC(Case_Conv_Start_Timer.DN) OTE(&97cafb22:O.Start) ,OTE(&97cafb22:O.Forward) ,MOV(Case_Conv_Speed,&97cafb22:O.FreqCommand) ];
```

### Extraction record 30

```text
XIC(Panelview_PB[5])XIC(&97cafb22:I.Faulted)OTE(&97cafb22:O.ClearFaults);
```

### Extraction record 33

```text
XIC(Case_Conv_Run)XIO(Case_1_Present_to_Pack_EE6)XIO(Case_3_Present_to_Pack_EE8)[XIO(Case_2_Present_to_Pack_EE7) XIO(Case_4_Present_to_Pack_EE9) ,XIC(Two_Cases_per_Cycle) ]TON(Cases_Clear_at_Pack_Station_Delay,?,?);
```

### Extraction record 60

```text
[XIC(Case_Conv_Run) [XIC(Case_Conv_Run) XIC(Case_Indexer_Retract_Delay.DN) XIC(Case_1_Ready_to_Index_EE10) XIC(Case_3_Ready_to_Index_EE12) [XIC(Case_2_Ready_to_Index_EE11) XIC(Case_4_Ready_to_Index_EE13) ,XIC(Two_Cases_per_Cycle) ] XIO(Case_Backup_Timer.DN) ,XIC(Basket_Raised) XIC(Case_Index_Cyl_Retract_SOL7) ] ,XIC(PICK_N_PLACE_BYPASS) ][OTE(Case_Index_Cyl_Retract_SOL7) ,XIO(PICK_N_PLACE_BYPASS) OTE(Case_Clamp_2_Extend_SOL9) ];
```

### Extraction record 72

```text
[XIO(MCR_Delay.DN) ,XIC(Vertical_Axis_Jam) ,GRT(Shared.AxisFault,0) ,XIC(Shared.PhysicalAxisFault) ,XIC(Vertical_Axis.PhysicalAxisFault) ,XIC(Vertical_Axis.CIPAxisState.8) ,XIC(Horizontal_Axis.PhysicalAxisFault) ,XIC(Horizontal_Axis.CIPAxisState.8) ,XIO(Shared.ShuntThermalSwitchInputStatus) ,XIC(&4a46a850:I.Faulted) ,XIC(&97cafb22:I.Faulted) ,XIO(Vertical_Axis.NegativeOvertravelInputStatus) ,XIO(Vertical_Axis.PositiveOvertravelInputStatus) ,XIO(Horizontal_Axis.NegativeOvertravelInputStatus) ,XIO(Horizontal_Axis.PositiveOvertravelInputStatus) ]OTE(Red_Light_Fault);
```

### Extraction record 84

```text
XIO(Master_Control_Relay_MCR)[MOV(5,Local_Message_Display) ,JMP(Jump_1) ];
```

### Extraction record 85

```text
XIC(E_Stop_PB_Oper_Station)[MOV(1,Local_Message_Display) ,JMP(Jump_1) ];
```

### Extraction record 86

```text
XIC(E_Stop_PB_Control_Panel)[MOV(2,Local_Message_Display) ,JMP(Jump_1) ];
```

### Extraction record 87

```text
XIC(E_Stop_PB_Bottle_Conv_Side)[MOV(3,Local_Message_Display) ,JMP(Jump_1) ];
```

### Extraction record 88

```text
XIC(Safety_Relay_SR2_Aux)[MOV(5,Local_Message_Display) ,JMP(Jump_1) ];
```

### Extraction record 103

```text
XIC(MCR_Delay.DN)XIC(Air_Pressure_OK_PS1)XIO(Vertical_Axis_Rod_Lock_Released_PRS15)[MOV(52,Local_Message_Display) ,JMP(Jump_1) ];
```

### Extraction record 104

```text
XIC(MCR_Delay.DN)XIO(Vertical_Axis_Has_Homed)[MOV(25,Local_Message_Display) ,JMP(Jump_1) ];
```

### Extraction record 105

```text
XIC(MCR_Delay.DN)XIO(Horizontal_Axis_Has_Homed)[MOV(26,Local_Message_Display) ,JMP(Jump_1) ];
```

### Extraction record 199

```text
[LEQ(Vertical_Axis.ActualPosition,Jog_Soft_Limit[0]) OTE(Soft_Limit[0]) ,GEQ(Vertical_Axis.ActualPosition,Jog_Soft_Limit[1]) OTE(Soft_Limit[1]) ,GEQ(Horizontal_Axis.ActualPosition,Jog_Soft_Limit[2]) OTE(Soft_Limit[2]) ,LEQ(Horizontal_Axis.ActualPosition,Jog_Soft_Limit[3]) OTE(Soft_Limit[3]) ];
```

### Extraction record 200

```text
[XIO(Panelview_PB[10]) XIO(Panelview_PB[11]) ,XIC(Vertical_Axis_Jam) ]ONS(Vert_Stop_OS)MAS(Vertical_Axis,Vertical_Axis_MAS,Jog,Yes,250,Units per sec2,No,1,% of Maximum);
```

### Extraction record 201

```text
XIC(MCR_Delay.DN)[XIC(Vertical_Axis.AxisHomedStatus) XIC(Vertical_Axis_MAH.DN) XIC(Vertical_Axis.HomeEventStatus) ONS(Vert_Home_Event_OS) ,XIC(Vertical_Axis_Has_Homed) [XIO(Panelview_PB[10]) XIO(Panelview_PB[11]) ,XIC(Cycle_Start) ] ]OTE(Vertical_Axis_Has_Homed);
```

### Extraction record 203

```text
XIC(MCR_Delay.DN)[XIC(Horizontal_Axis.AxisHomedStatus) XIC(Horizontal_Axis_MAH.DN) XIC(Horizontal_Axis.HomeEventStatus) ONS(Horiz_Home_Event_OS) ,XIC(Horizontal_Axis_Has_Homed) [XIO(Panelview_PB[13]) XIO(Panelview_PB[14]) ,XIC(Cycle_Start) ] ]OTE(Horizontal_Axis_Has_Homed);
```

### Extraction record 204

```text
[XIC(Vertical_Axis_Has_Homed) XIC(Horizontal_Axis_Has_Homed) ONS(Homed_OS) ,XIO(MCR_Delay.DN) ][MOV(0,Step) ,MOV(0,Step_1) ,MOV(0,Step_2) ];
```

### Extraction record 244

```text
XIC(MCR_Delay.DN)XIO(Cycle_Start)XIC(Air_Pressure_OK_PS1)XIC(Vertical_Axis_Rod_Lock_Released_PRS15)[XIC(Panelview_PB[12]) ,XIC(Auto_Home_Vertical) ]MAH(Vertical_Axis,Vertical_Axis_MAH);
```

### Extraction record 245

```text
XIC(MCR_Delay.DN)XIO(Cycle_Start)[XIC(Panelview_PB[15]) ,XIC(Auto_Home_Horizontal) ]MAH(Horizontal_Axis,Horizontal_Axis_MAH);
```

### Extraction record 246

```text
XIC(System_Auto_Home)XIC(Vertical_Axis.AxisHomedStatus)XIC(Vertical_Axis_MAH.DN)XIC(Vertical_Axis.HomeEventStatus)XIC(Horizontal_Axis.AxisHomedStatus)XIC(Horizontal_Axis_MAH.DN)XIC(Horizontal_Axis.HomeEventStatus)LEQ(Vertical_Axis.ActualPosition,1)LEQ(Horizontal_Axis.ActualPosition,1)OTE(System_Auto_Home_Complete);
```

### Extraction record 248

```text
XIC(MCR_Delay.DN)XIO(Cycle_Start)XIC(Air_Pressure_OK_PS1)XIC(Vertical_Axis_Rod_Lock_Released_PRS15)XIC(Panelview_PB[11])[XIO(Soft_Limit[0]) XIC(Vertical_Axis.NegativeOvertravelInputStatus) ,XIC(Over_Ride_Vertical_Axis_Overtravel_CR3) ]MAJ(Vertical_Axis,Vertical_Axis_MAJ2,1,3,Units per sec,25,Units per sec2,25,Units per sec2,Trapezoidal,1,1,% of Maximum,Disabled,Programmed,0,None);
```

### Extraction record 249

```text
XIC(MCR_Delay.DN)XIO(Cycle_Start)XIC(Air_Pressure_OK_PS1)XIO(Vertical_Axis_Jam)XIC(Vertical_Axis_Rod_Lock_Released_PRS15)XIC(Panelview_PB[10])[XIO(Soft_Limit[1]) XIC(Vertical_Axis.PositiveOvertravelInputStatus) ,XIC(Over_Ride_Vertical_Axis_Overtravel_CR3) ]MAJ(Vertical_Axis,Vertical_Axis_MAJ1,0,3,Units per sec,25,Units per sec2,25,Units per sec2,Trapezoidal,1,1,% of Maximum,Disabled,Programmed,0,None);
```

### Extraction record 253

```text
XIC(MCR_Delay.DN)XIC(Case_Conv_Run)XIC(Bottle_Conv_Run)XIC(Air_Pressure_OK_PS1)XIC(Vertical_Axis_Rod_Lock_Released_PRS15)XIO(Panelview_PB[24])XIO(Vertical_Axis_Jam)XIC(Vertical_Axis_Has_Homed)XIC(Horizontal_Axis_Has_Homed)XIC(Cycle_Stop_PB_Oper_Station)XIO(Panelview_PB[3])[XIC(Panelview_PB[2]) ,XIC(Panelview_PB[30]) ,XIC(Cycle_Start) ]OTE(Cycle_Start);
```

### Extraction record 259

```text
[XIC(Panelview_PB[11]) XIC(Soft_Limit[0]) ,XIC(Panelview_PB[10]) XIC(Soft_Limit[1]) ]ONS(Vert_Jog_Ons)MAS(Vertical_Axis,Vertical_Axis_MAS2,Jog,Yes,250,Units per sec2,No,1,% of Maximum);
```

### Extraction record 260

```text
[XIO(Panelview_PB[13]) XIO(Panelview_PB[14]) ,XIC(Cycle_Start) ]ONS(Horiz_Stop_OS)MAS(Horizontal_Axis,Horizontal_Axis_MAS,Jog,Yes,250,Units per sec2,No,1,% of Maximum);
```

### Extraction record 261

```text
[XIC(Panelview_PB[14]) XIC(Soft_Limit[3]) ,XIC(Panelview_PB[13]) XIC(Soft_Limit[2]) ]ONS(Horiz_Jog_Ons)MAS(Horizontal_Axis,Horizontal_Axis_MAS2,Jog,Yes,250,Units per sec2,No,1,% of Maximum);
```

### Extraction record 262

```text
XIC(MCR_Delay.DN)XIO(Cycle_Start)XIC(Air_Pressure_OK_PS1)XIC(Vertical_Axis_Rod_Lock_Released_PRS15)[XIC(Panelview_PB[29]) ,XIC(System_Auto_Home) ]XIO(System_Auto_Home_Complete)[OTE(System_Auto_Home) ,ONS(Home_Ons[0]) OTE(Auto_Home_Vertical) ,LEQ(Vertical_Axis.ActualPosition,3) XIC(Vertical_Axis.AxisHomedStatus) XIC(Vertical_Axis_MAH.DN) XIC(Vertical_Axis.HomeEventStatus) ONS(Home_Ons[1]) OTE(Auto_Home_Horizontal) ];
```

