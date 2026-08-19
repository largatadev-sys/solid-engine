import { LayoutAnimation } from 'react-native';
import { pollMotion } from '../theme/workspaceTokens';


export function animateRowGrowth(): void {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(
      pollMotion.rowGrowthMs,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.scaleXY,
    ),
  );
}
