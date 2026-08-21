import { chatMotion } from '../theme/workspaceTokens';


export function animateComposerGrowth(): void {}


export const composerFieldTransition = {
  transitionProperty: 'height',
  transitionDuration: `${chatMotion.layoutMs}ms`,
  transitionTimingFunction: 'ease-in-out',
  scrollbarWidth: 'none',
} as const;
