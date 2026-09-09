import type {
  ComponentRecord,
  DocumentRecord,
  EvidenceRecord,
  FacilityArea,
  FacilityAsset,
  RelationshipRecord,
  RevisionRecord,
  VerificationState,
} from '../types/facility';

export interface FacilityIdentity {
  production?: import('./production').ProductionConfig;
  id: string;
  name: string;
  status: string;
  location: string;
}

export interface FacilityCabinetPackage {
  id: string;
  assetId: string;
  drawing: string;
  raster: string;
  pdf: string;
  metadata: string;
  destUnknown: boolean;
}

export interface FacilityDriveSlot {
  index: number;
  componentId: string;
  cabinetDeviceId: string;
  drawingLabel: string;
  loadLabel: string | null;
}

export interface FacilityFeatureConfig {
  defaultAreaId: string;
  featuredCabinetAssetId: string;
  featuredMachineAssetId: string;
  brandMark?: string;
  cabinetPackage?: FacilityCabinetPackage;
  driveSlots?: FacilityDriveSlot[];
}

export type FacilityMapMarkerState = 'LIVE' | 'REFERENCE' | 'FIELD_VERIFY';
export type FacilityMapMarkerTone = 'cabinet' | 'machine' | 'power';

export interface FacilityMapMarker {
  id: string;
  label: string;
  x: number;
  y: number;
  tone: FacilityMapMarkerTone;
  state: FacilityMapMarkerState;
  assetId?: string;
  /** Optional provenance for audits; missing means legacy/reference content. */
  placementSource?: 'REFERENCE_DRAWING' | 'TECHNICIAN' | 'VERIFIED_RECORD';
}

export interface FacilityMapWall {
  id: string;
  points: Array<{ x: number; y: number }>;
  kind: 'WALL' | 'DIVIDER';
  label?: string;
}

export type FacilityMapAnnotation =
  | { id: string; kind: 'FREEHAND' | 'HIGHLIGHT'; points: Array<{ x: number; y: number }>; color: string; label?: string }
  | { id: string; kind: 'LINE' | 'ARROW'; points: Array<{ x: number; y: number }>; color: string; label?: string }
  | { id: string; kind: 'RECTANGLE' | 'CIRCLE'; x: number; y: number; width: number; height: number; color: string; label?: string }
  | { id: string; kind: 'TEXT' | 'NOTE'; x: number; y: number; text: string; color: string; label?: string };

export type MapSymbolKind = 'door' | 'double-door' | 'sliding-door' | 'rollup-door' | 'stairs' | 'column' | 'window' | 'dock' | 'drain' | 'barrier' | 'custom';
export interface FacilityMapSymbol {
  id: string; kind: MapSymbolKind; label: string;
  x: number; y: number; width: number; height: number;
  rotation: number; flipped?: boolean; steps?: number; direction?: 'up' | 'down';
  paths?: Array<Array<{ x: number; y: number }>>;
}
export interface FacilityReferenceMask {
  id: string; x: number; y: number; width: number; height: number;
  label: string;
}
export type StudioLayer = 'reference' | 'areas' | 'walls' | 'symbols' | 'equipment' | 'markup' | 'masks';
export interface FacilityMapStudio {
  layers?: Partial<Record<StudioLayer, { visible: boolean; locked: boolean }>>;
  referenceOpacity?: number;
  snap?: number;
  symbols?: FacilityMapSymbol[];
  masks?: FacilityReferenceMask[];
  templates?: FacilityMapSymbol[];
}

export interface EditableFacilityMapConfig {
  studio?: FacilityMapStudio;
  markers?: FacilityMapMarker[];
  walls?: FacilityMapWall[];
  annotations?: FacilityMapAnnotation[];
  drawingWidth?: number;
  drawingHeight?: number;
  drawingTitle?: string;
  contentBounds?: { x: number; y: number; width: number; height: number };
  [key: string]: unknown;
}

// mapConfig is intentionally left permissive to avoid tight coupling to a specific shape.
// Using Record<string, any> prevents build failures when map shape evolves in content-only changes.
export type FacilityMapConfig = EditableFacilityMapConfig;

export interface AssetSerialSource {
  id: string;
  assetId: string;
  label: string;
  value: string;
  evidenceId: string;
  verificationStatus: VerificationState;
}

export interface FacilityPackage {
  schemaVersion: 2;
  packageRevision: number;
  entityVersions: Record<string, number>;
  facility: FacilityIdentity;
  featureConfig: FacilityFeatureConfig;
  mapConfig?: FacilityMapConfig;
  areas: FacilityArea[];
  assets: FacilityAsset[];
  components: ComponentRecord[];
  relationships: RelationshipRecord[];
  documents: DocumentRecord[];
  evidence: EvidenceRecord[];
  revisions: RevisionRecord[];
  assetSerialSources: AssetSerialSource[];
}
