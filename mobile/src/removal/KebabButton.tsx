import { StyleSheet, View } from 'react-native';
import { Icon } from '../components/Icon';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { profileColors, profileMetrics } from '../theme/workspaceTokens';


interface KebabButtonProps {
  readonly label: string;
  readonly inset: 'row' | 'footer';
  readonly onPress: () => void;
}


export function KebabButton({ label, inset, onPress }: KebabButtonProps) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={[styles.hit, inset === 'row' ? styles.rowInset : styles.footerInset, press.style]}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View>
        <Icon
          name="moreHorizontal"
          size={profileMetrics.kebabGlyph}
          color={profileColors.kebab}
        />
      </View>
    </AnimatedPressable>
  );
}


const styles = StyleSheet.create({
  hit: {
    minWidth: profileMetrics.kebabHit,
    minHeight: profileMetrics.kebabHit,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  rowInset: {
    marginRight: profileMetrics.kebabRowInset,
  },
  footerInset: {
    marginVertical: profileMetrics.kebabFooterInset,
    marginRight: profileMetrics.kebabFooterInset,
  },
});
