import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import activeFacilityPackage from './activeFacility';
import type { FacilityMapMarker, FacilityPackage } from './types';
import type { FacilityAsset, RelationshipRecord } from '../types/facility';
import {
  ensurePlantSeed,
  exportPlantBackup,
  importPlantBackup,
  listAttachments,
  listObservations,
  putAttachment,
  putObservation,
  resetPlant,
  savePlant,
  type AttachmentRecord,
  type ObservationRecord,
  type PlantBackup,
} from './runtimeDb';

const FacilityContext = createContext<FacilityPackage | null>(null);

export interface FacilityEditorApi {
  ready: boolean;
  saveAsset(asset: FacilityAsset, marker?: { x: number; y: number }): Promise<void>;
  deleteAsset(assetId: string): Promise<void>;
  saveRelationship(relationship: RelationshipRecord): Promise<void>;
  deleteRelationship(relationshipId: string): Promise<void>;
  saveMarker(marker: FacilityMapMarker): Promise<void>;
  deleteMarker(markerId: string): Promise<void>;
  addAttachment(assetId: string, file: File, verificationStatus?: 'VERIFIED' | 'FIELD_VERIFY'): Promise<AttachmentRecord>;
  attachments(assetId?: string): Promise<AttachmentRecord[]>;
  addObservation(input: Omit<ObservationRecord, 'id' | 'createdAt'>): Promise<ObservationRecord>;
  observations(assetId?: string): Promise<ObservationRecord[]>;
  exportBackup(): Promise<PlantBackup>;
  importBackup(backup: PlantBackup, mode: 'replace' | 'merge'): Promise<void>;
  resetToBaseline(): Promise<void>;
}

const EditorContext = createContext<FacilityEditorApi | null>(null);

function stampRevision(pkg: FacilityPackage, entityId: string, reason: string): FacilityPackage {
  return {
    ...pkg,
    revisions: [
      ...pkg.revisions,
      {
        id: crypto.randomUUID(),
        entityId,
        fieldPath: '*',
        changedAt: new Date().toISOString(),
        changedBy: 'in-app-editor',
        reason,
        evidenceIds: [],
        reviewState: 'DRAFT',
      },
    ],
  };
}

export function FacilityProvider({
  children,
  value = activeFacilityPackage,
}: {
  children: ReactNode;
  value?: FacilityPackage;
}) {
  const [pkg, setPkg] = useState<FacilityPackage>(value);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    ensurePlantSeed(value)
      .then((stored) => {
        if (!alive) return;
        setPkg(stored);
        setReady(true);
      })
      .catch(() => {
        if (!alive) return;
        setPkg(value);
        setReady(true);
      });
    return () => { alive = false; };
  }, [value]);

  const commit = useCallback(async (next: FacilityPackage) => {
    setPkg(next);
    await savePlant(next);
  }, []);

  const editor = useMemo<FacilityEditorApi>(() => ({
    ready,
    async saveAsset(asset, markerPosition) {
      const assets = pkg.assets.some((item) => item.id === asset.id)
        ? pkg.assets.map((item) => item.id === asset.id ? asset : item)
        : [...pkg.assets, asset];
      const areas = pkg.areas.map((area) => {
        const ids = area.assetIds.filter((id) => id !== asset.id);
        return area.id === asset.areaId ? { ...area, assetIds: [...ids, asset.id] } : { ...area, assetIds: ids };
      });
      const markers = [...(pkg.mapConfig?.markers ?? [])] as FacilityMapMarker[];
      if (markerPosition) {
        const marker: FacilityMapMarker = {
          id: `PIN-${asset.id}`,
          label: asset.name,
          x: markerPosition.x,
          y: markerPosition.y,
          tone: asset.type.toLowerCase().includes('cabinet') || asset.type.toLowerCase().includes('panel') ? 'cabinet' : asset.type.toLowerCase().includes('machine') || asset.type.toLowerCase().includes('conveyor') ? 'machine' : 'power',
          state: asset.verificationStatus === 'FIELD_VERIFY' ? 'FIELD_VERIFY' : 'LIVE',
          assetId: asset.id,
        };
        const index = markers.findIndex((item) => item.assetId === asset.id || item.id === marker.id);
        if (index >= 0) markers[index] = { ...markers[index], ...marker };
        else markers.push(marker);
      }
      await commit(stampRevision({ ...pkg, assets, areas, mapConfig: { ...(pkg.mapConfig ?? {}), markers } }, asset.id, 'Asset saved in application'));
    },
    async deleteAsset(assetId) {
      const next: FacilityPackage = {
        ...pkg,
        assets: pkg.assets.filter((item) => item.id !== assetId),
        components: pkg.components.filter((item) => item.parentId !== assetId),
        relationships: pkg.relationships.filter((item) => item.source !== assetId && item.target !== assetId),
        documents: pkg.documents.filter((item) => item.assetId !== assetId),
        areas: pkg.areas.map((area) => ({ ...area, assetIds: area.assetIds.filter((id) => id !== assetId) })),
        mapConfig: { ...(pkg.mapConfig ?? {}), markers: ((pkg.mapConfig?.markers ?? []) as FacilityMapMarker[]).filter((item) => item.assetId !== assetId) },
      };
      await commit(stampRevision(next, assetId, 'Asset deleted in application'));
    },
    async saveRelationship(relationship) {
      const relationships = pkg.relationships.some((item) => item.id === relationship.id)
        ? pkg.relationships.map((item) => item.id === relationship.id ? relationship : item)
        : [...pkg.relationships, relationship];
      await commit(stampRevision({ ...pkg, relationships }, relationship.id, 'Relationship saved in application'));
    },
    async deleteRelationship(relationshipId) {
      await commit(stampRevision({ ...pkg, relationships: pkg.relationships.filter((item) => item.id !== relationshipId) }, relationshipId, 'Relationship deleted in application'));
    },
    async saveMarker(marker) {
      const markers = [...(pkg.mapConfig?.markers ?? [])] as FacilityMapMarker[];
      const index = markers.findIndex((item) => item.id === marker.id);
      if (index >= 0) markers[index] = marker;
      else markers.push(marker);
      await commit({ ...pkg, mapConfig: { ...(pkg.mapConfig ?? {}), markers } });
    },
    async deleteMarker(markerId) {
      await commit({ ...pkg, mapConfig: { ...(pkg.mapConfig ?? {}), markers: ((pkg.mapConfig?.markers ?? []) as FacilityMapMarker[]).filter((item) => item.id !== markerId) } });
    },
    async addAttachment(assetId, file, verificationStatus = 'FIELD_VERIFY') {
      const lower = file.name.toLowerCase();
      const category: AttachmentRecord['category'] = file.type.startsWith('image/') ? 'PHOTO' : file.type === 'application/pdf' || lower.endsWith('.pdf') ? 'PDF' : lower.match(/\.(dwg|dxf|svg)$/) ? 'DRAWING' : 'OTHER';
      const record: AttachmentRecord = {
        id: crypto.randomUUID(), assetId, name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size,
        blob: file, category, verificationStatus, createdAt: new Date().toISOString(),
      };
      await putAttachment(record);
      return record;
    },
    attachments: listAttachments,
    async addObservation(input) {
      const record: ObservationRecord = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      await putObservation(record);
      return record;
    },
    observations: listObservations,
    exportBackup: exportPlantBackup,
    async importBackup(backup, mode) {
      const next = await importPlantBackup(backup, mode);
      setPkg(next);
    },
    async resetToBaseline() {
      await resetPlant(value);
      setPkg(structuredClone(value));
    },
  }), [ready, pkg, value, commit]);

  return (
    <FacilityContext.Provider value={pkg}>
      <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
    </FacilityContext.Provider>
  );
}

export function useFacility(): FacilityPackage {
  const value = useContext(FacilityContext);
  if (!value) throw new Error('useFacility must be used within FacilityProvider');
  return value;
}

export function useFacilityEditor(): FacilityEditorApi {
  const value = useContext(EditorContext);
  if (!value) throw new Error('useFacilityEditor must be used within FacilityProvider');
  return value;
}
