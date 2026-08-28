import { describe, expect, it } from 'vitest';
import { demoFacilityPackage } from '../../facilities/demo-plant';
import { previewBulkImport } from './bulkImport';

describe('structured bulk import preview', () => {
  it('defaults imported facts and relationships to FIELD_VERIFY', () => {
    const csv = 'recordType,id,name,type,areaId,source,target,relationshipType,verificationStatus\nasset,TEST-A,Test Asset,Motor,area-demo-floor,,,,VERIFIED\nrelationship,TEST-R,,,,DEMO-CAB-001,TEST-A,CONTROLS,VERIFIED';
    const preview = previewBulkImport(csv, demoFacilityPackage);
    expect(preview.errors).toEqual([]);
    expect(preview.unresolved).toEqual([]);
    expect(preview.records.map((item) => item.value.verificationStatus)).toEqual(['FIELD_VERIFY', 'FIELD_VERIFY']);
  });

  it('reports duplicates and unresolved endpoints without committing them', () => {
    const csv = 'recordType,id,name,areaId,source,target,relationshipType\nasset,DUP,One,area-demo-floor,,,\nasset,DUP,Two,area-demo-floor,,,\nrelationship,REL,,,,MISSING,CONTROLS';
    const preview = previewBulkImport(csv, demoFacilityPackage);
    expect(preview.duplicates).toHaveLength(1);
    expect(preview.unresolved).toHaveLength(1);
    expect(preview.records).toHaveLength(1);
  });

  it('accepts explicit verification metadata only with deliberate opt-in', () => {
    const csv = 'recordType,id,name,areaId,verificationStatus\nasset,TEST-A,Test Asset,area-demo-floor,VERIFIED';
    expect(previewBulkImport(csv, demoFacilityPackage).records[0].value.verificationStatus).toBe('FIELD_VERIFY');
    expect(previewBulkImport(csv, demoFacilityPackage, { acceptVerificationMetadata: true }).records[0].value.verificationStatus).toBe('VERIFIED');
  });
});
