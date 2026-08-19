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
  id: string;
  name: string;
  status: string;
  location: string;
}

export interface FacilityFeatureConfig {
  defaultAreaId: string;
  featuredCabinetAssetId: string;
  featuredMachineAssetId: string;
  brandMark?: string;
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
}

export interface FacilityMapConfig {
  drawingTitle: string;
  drawingDate?: string;
  markers: FacilityMapMarker[];
  interactiveAreaNames: string[];
}

export interface AssetSerialSource {
  id: string;
  assetId: string;
  label: string;
  value: string;
  evidenceId: string;
  verificationStatus: VerificationState;
}

export interface FacilityPackage {
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
