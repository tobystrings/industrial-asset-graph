import { describe, expect, it } from 'vitest';
import { GuideController } from './GuideController';

describe('GuideController', () => {
  it('enforces the automatic prompt cooldown', () => {
    const controller = new GuideController();
    expect(controller.mayAutoPrompt(1_000, true)).toBe(true);
    controller.recordPrompt(1_000);
    expect(controller.mayAutoPrompt(10_000)).toBe(false);
    expect(controller.mayAutoPrompt(46_001)).toBe(true);
  });
});
