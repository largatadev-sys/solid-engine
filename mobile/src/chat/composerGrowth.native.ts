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


export const composerFieldTransition = {};
