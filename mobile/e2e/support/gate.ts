import { test } from '@playwright/test';
import { authenticatedReadiness, backendReachable, missingPoolEnv } from './pool';
import type { PoolTag } from './identities';

export function requireStack(tag: PoolTag): void {
  test.beforeAll(async () => {
    const missing = missingPoolEnv();
    if (missing.length > 0) {
      test.skip(
        true,
        `pool environment absent (${missing.join(', ')}) — run: cd mobile && set -a && . ./.env && set +a`,
      );
    }
    if (!(await backendReachable())) {
      test.skip(true, 'backend unreachable — this spec never ran; it is not a product failure');
    }
    if (!(await authenticatedReadiness(tag))) {
      test.skip(
        true,
        `backend is up but rejecting ${tag}'s token — this spec never ran; it is not a product failure`,
      );
    }
  });
}
