import type {
  ComponentRecord,
  DocumentRecord,
  EvidenceRecord,
  FacilityArea,
  FacilityAsset,
  RelationshipRecord,
  RevisionRecord,
} from '../types/facility';

/**
 * Facility-neutral identity displayed by the platform shell.
 * Customer-specific values belong in the facility package, not framework code.
 */
export interface FacilityIdentity {
  id: string;
  name: string;
  status: string;
  location: string;
}

/**
 * The contract between the reusable Industrial Asset Graph framework and a
 * facility-specific dataset. Keeping this boundary explicit lets a future
 * facility package replace Lieb data without changing framework behavior.
 */
export interface FacilityPackage {
  facility: FacilityIdentity;
  areas: FacilityArea[];
  assets: FacilityAsset[];
  components: ComponentRecord[];
  relationships: RelationshipRecord[];
  documents: DocumentRecord[];
  evidence: EvidenceRecord[];
  revisions: RevisionRecord[];
}
