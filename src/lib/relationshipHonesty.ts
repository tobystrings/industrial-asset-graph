import activeFacilityPackage from '../facility/activeFacility';
const { relationships } = activeFacilityPackage;
import type { RelationshipType } from '../types/facility';

export const UNUSED_RELATIONSHIP_TYPES = ['FEEDS', 'CONTROLS', 'SENSES', 'INTERLOCKS_WITH', 'SUPPLIES', 'UPSTREAM_OF'] as const satisfies readonly RelationshipType[];

export function suppliesHonesty(): { type: 'SUPPLIES'; count: 0; note: string } {
  return { type: 'SUPPLIES', count: 0, note: '480 VAC shown · upstream panel unknown' };
}

export function relationshipTypeCount(type: RelationshipType): number {
  return relationships.filter((item) => item.type === type).length;
}

export function unusedRelationshipCounts(): Record<(typeof UNUSED_RELATIONSHIP_TYPES)[number], number> {
  return Object.fromEntries(
    UNUSED_RELATIONSHIP_TYPES.map((type) => [type, relationshipTypeCount(type)]),
  ) as Record<(typeof UNUSED_RELATIONSHIP_TYPES)[number], number>;
}
