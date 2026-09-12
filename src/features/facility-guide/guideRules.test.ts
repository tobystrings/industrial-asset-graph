import { describe, expect, it } from 'vitest';
import { chooseGuideRule, nextGuideMessage } from './guideRules';
import { answerGuide } from './guideKnowledge';
import type { GuideContext } from './guideTypes';
describe('Genie grounded dialogue', () => {
  const c: GuideContext = {page:'cabinet',assetId:'TEST',verification:'FIELD_VERIFY',electricalGaps:['Voltage'],missingFields:['Check label'],disputedCount:1,relationshipCount:3,verifiedRelationships:1,upstreamCount:0,downstreamCount:0};
  it('prioritizes conflicting evidence above generic page or missing-field prompts', () => {
    expect(chooseGuideRule(c,[])?.id).toBe('conflict');
    expect(chooseGuideRule({...c,disputedCount:0},[])?.id).toBe('electrical');
    expect(chooseGuideRule({page:'cabinet'},[])?.id).toBe('cabinet');
  });
  it('respects dismissed rules while allowing lower-priority guidance', () => {
    expect(chooseGuideRule(c,['conflict'])?.id).toBe('electrical');
  });
  it('prioritizes the actual workflow over unrelated missing electrical fields', () => {
    expect(chooseGuideRule({...c,disputedCount:0,page:'relationships'},[])?.id).toBe('relationships');
    expect(chooseGuideRule({...c,disputedCount:0,page:'documents'},[])?.id).toBe('documents');
    expect(chooseGuideRule({...c,disputedCount:0,page:'map',editingMap:true},[])?.id).toBe('map-edit');
  });
  it('keeps all personalities grounded and preserves safety language', () => {
    for (const personality of ['professional','crew','full'] as const) {
      expect(nextGuideMessage(c,personality).body).toContain('TEST');
      const electrical = answerGuide('electrical',c,personality);
      expect(electrical.body).toContain('LOTO');
      expect(electrical.body).toContain('UNVERIFIED');
      expect(answerGuide('verification',c,personality).body).toContain('never overwrite canonical facts');
      expect(answerGuide('trace',c,personality).body).toContain('do not establish');
    }
    expect(nextGuideMessage({...c,disputedCount:0},'full').title).not.toBe(nextGuideMessage({...c,disputedCount:0},'professional').title);
  });
  it('does not invent work orders or promise local uploads when publication is enabled', () => {
    expect(answerGuide('work',c,'crew').body).toContain('does not issue CMMS work orders');
    expect(answerGuide('evidence',c,'crew',true).body).toContain('may be published');
    expect(answerGuide('evidence',c,'crew',false).body).toContain('New uploads are LOCAL_ONLY');
    expect(answerGuide('trace',{page:'help'},'crew').body).toContain('Choose equipment');
  });
});
