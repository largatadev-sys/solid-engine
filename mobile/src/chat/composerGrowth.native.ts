import { LayoutAnimation } from 'react-native';
import { chatMotion } from '../theme/workspaceTokens';


export function animateComposerGrowth(): void {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(
      chatMotion.layoutMs,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.scaleXY,
    ),
  );
}


export function naturalContentHeight(_field: unknown, reported: number): number {
  return reported;
}


export const composerFieldTransition = {};


export const MEASURES_FROM_A_MIRROR = false;
