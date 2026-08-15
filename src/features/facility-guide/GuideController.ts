import { GUIDE_AUTO_COOLDOWN_MS, GUIDE_MAX_AUTO_PROMPTS } from './guideConfig';

export class GuideController {
  private count = 0;
  private lastPrompt = 0;
  mayAutoPrompt(now = Date.now(), firstRun = false) {
    return this.count < GUIDE_MAX_AUTO_PROMPTS && (firstRun || now - this.lastPrompt >= GUIDE_AUTO_COOLDOWN_MS);
  }
  recordPrompt(now = Date.now()) { this.count += 1; this.lastPrompt = now; }
  reset() { this.count = 0; this.lastPrompt = 0; }
}

