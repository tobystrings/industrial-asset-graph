import { describe, expect, it } from 'vitest';
import { chooseGuideRule } from './guideRules';

describe('facility guide rules', () => {
  it('selects the cabinet rule for the cabinet page', () => {
    expect(chooseGuideRule({ page: 'cabinet', assetId: 'L2-CC-001' }, [])?.id).toBe('cabinet');
  });

  it('does not select a permanently dismissed rule', () => {
    expect(chooseGuideRule({ page: 'relationships' }, ['relationships'])).toBeUndefined();
  });
});

