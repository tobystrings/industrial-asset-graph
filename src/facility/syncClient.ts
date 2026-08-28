import { isTransportEligible, type MutationResult, type SyncMutation } from './syncContract';
import type { FacilityPackage } from './types';
import type { SyncEntityType } from './syncContract';

export type CanonicalEntityEnvelope = { entityId: string; entityType: SyncEntityType; version: number; value?: Record<string, unknown>; deleted: boolean; updatedAt: string; updatedBy: string };

export type SyncPhase = 'LOCAL_ONLY' | 'OFFLINE' | 'PENDING' | 'SYNCING' | 'SYNCED' | 'CONFLICT' | 'ERROR';
export type SyncSummary = {
  phase: SyncPhase;
  accepted: MutationResult[];
  conflicts: Extract<MutationResult, { status: 'conflict' }>[];
  retained: SyncMutation[];
  syncedAt?: string;
  error?: string;
};

export interface SyncTransport {
  send(facilityId: string, mutation: SyncMutation): Promise<MutationResult>;
  pull?(facilityId: string, since?: string): Promise<CanonicalEntityEnvelope[]>;
}

export class HttpSyncTransport implements SyncTransport {
  constructor(private readonly baseUrl: string, private readonly fetcher: typeof fetch = fetch, private readonly writeToken?: string) {}

  async send(facilityId: string, mutation: SyncMutation): Promise<MutationResult> {
    const response = await this.fetcher(`${this.baseUrl.replace(/\/$/, '')}/api/facilities/${encodeURIComponent(facilityId)}/mutations`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...(this.writeToken ? { authorization: `Bearer ${this.writeToken}` } : {}) }, body: JSON.stringify(mutation),
    });
    const result = await response.json() as MutationResult | { error?: string };
    if (response.status === 409 && 'status' in result && result.status === 'conflict') return result;
    if (!response.ok || !('status' in result)) throw new Error('error' in result && result.error ? result.error : `Sync failed with HTTP ${response.status}.`);
    return result;
  }

  async pull(facilityId: string, since?: string): Promise<CanonicalEntityEnvelope[]> {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    const response = await this.fetcher(`${this.baseUrl.replace(/\/$/, '')}/api/facilities/${encodeURIComponent(facilityId)}/entities${query}`);
    const result = await response.json() as { entities?: CanonicalEntityEnvelope[]; error?: string };
    if (!response.ok || !Array.isArray(result.entities)) throw new Error(result.error ?? `Pull failed with HTTP ${response.status}.`);
    return result.entities;
  }
}

export function applyCanonicalEntities(pkg: FacilityPackage, entities: CanonicalEntityEnvelope[]): FacilityPackage {
  const next = structuredClone(pkg);
  const upsert = <T extends { id: string }>(rows: T[], value: T) => rows.some((item) => item.id === value.id) ? rows.map((item) => item.id === value.id ? value : item) : [...rows, value];
  for (const entity of entities) {
    next.entityVersions[entity.entityId] = entity.version;
    const value = entity.value as ({ id: string } & Record<string, unknown>) | undefined;
    if (entity.entityType === 'facility' && value && !entity.deleted) next.facility = value as unknown as FacilityPackage['facility'];
    else if (entity.entityType === 'area') next.areas = entity.deleted ? next.areas.filter((item) => item.id !== entity.entityId) : upsert(next.areas, value as unknown as FacilityPackage['areas'][number]);
    else if (entity.entityType === 'asset') next.assets = entity.deleted ? next.assets.filter((item) => item.id !== entity.entityId) : upsert(next.assets, value as unknown as FacilityPackage['assets'][number]);
    else if (entity.entityType === 'component') next.components = entity.deleted ? next.components.filter((item) => item.id !== entity.entityId) : upsert(next.components, value as unknown as FacilityPackage['components'][number]);
    else if (entity.entityType === 'relationship') next.relationships = entity.deleted ? next.relationships.filter((item) => item.id !== entity.entityId) : upsert(next.relationships, value as unknown as FacilityPackage['relationships'][number]);
    else if (entity.entityType === 'document') next.documents = entity.deleted ? next.documents.filter((item) => item.id !== entity.entityId) : upsert(next.documents, value as unknown as FacilityPackage['documents'][number]);
    else if (entity.entityType === 'evidence') next.evidence = entity.deleted ? next.evidence.filter((item) => item.id !== entity.entityId) : upsert(next.evidence, value as unknown as FacilityPackage['evidence'][number]);
    else if (entity.entityType === 'map_marker') {
      const markers = [...((next.mapConfig?.markers ?? []) as Array<{ id: string }>)] as Array<{ id: string }>;
      next.mapConfig = { ...(next.mapConfig ?? {}), markers: entity.deleted ? markers.filter((item) => item.id !== entity.entityId) : upsert(markers, value as { id: string }) };
    }
  }
  next.packageRevision += entities.length;
  return next;
}

export async function syncMutationQueue(facilityId: string, queue: SyncMutation[], transport: SyncTransport): Promise<SyncSummary> {
  const accepted: MutationResult[] = [];
  const conflicts: Extract<MutationResult, { status: 'conflict' }>[] = [];
  const retained: SyncMutation[] = [];
  for (const mutation of queue) {
    if (!isTransportEligible(mutation)) { retained.push(mutation); continue; }
    try {
      const result = await transport.send(facilityId, mutation);
      if (result.status === 'conflict') {
        conflicts.push(result);
        retained.push({ ...mutation, reviewState: 'CONFLICT', conflict: { baseVersion: result.baseVersion, currentVersion: result.currentVersion, attemptedValue: result.attemptedValue, currentValue: result.currentValue } });
      } else accepted.push(result);
    } catch (error) {
      retained.push(mutation);
      return { phase: 'ERROR', accepted, conflicts, retained: [...retained, ...queue.slice(queue.indexOf(mutation) + 1)], error: error instanceof Error ? error.message : 'Sync failed.' };
    }
  }
  const eligibleRetained = retained.some(isTransportEligible);
  return {
    phase: conflicts.length ? 'CONFLICT' : eligibleRetained ? 'PENDING' : retained.length ? 'LOCAL_ONLY' : 'SYNCED',
    accepted, conflicts, retained, syncedAt: new Date().toISOString(),
  };
}
