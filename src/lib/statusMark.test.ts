import { describe, expect, it } from 'vitest';
import { markerClass, markerForStatus } from './statusMark';

describe('statusMark', () => {
  it('encodes status as shape plus reserved tone', () => {
    expect(markerForStatus('VERIFIED')).toEqual({ shape: 'circle', tone: 'teal' });
    expect(markerForStatus('COMPLETE')).toEqual({ shape: 'circle', tone: 'teal' });
    expect(markerForStatus('FIELD_VERIFY')).toEqual({ shape: 'triangle', tone: 'amber' });
    expect(markerForStatus('IN_PROGRESS')).toEqual({ shape: 'triangle', tone: 'amber' });
    expect(markerForStatus('DISPUTED')).toEqual({ shape: 'diamond', tone: 'red' });
    expect(markerForStatus('INFERRED')).toEqual({ shape: 'square', tone: 'indigo' });
    expect(markerForStatus('RETIRED')).toEqual({ shape: 'square', tone: 'slate' });
    expect(markerForStatus('NOT_STARTED')).toEqual({ shape: 'square', tone: 'slate' });
    expect(markerClass('DISPUTED')).toContain('shape-diamond');
    expect(markerClass('INFERRED')).toContain('tone-indigo');
  });
});
