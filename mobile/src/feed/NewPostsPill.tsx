import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { radii, spacing } from '../theme';
import { feedColors, feedTypography } from '../theme/workspaceTokens';
import { FEED_NEW_POSTS } from './feedCopy';

const ARROW = 12;


export function NewPostsPill({ onPress }: { readonly onPress: () => void }) {
  return (
    <View style={styles.rail} pointerEvents="box-none">
      <Pressable
        style={styles.pill}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={FEED_NEW_POSTS}
      >
        <Icon name="chevronUp" size={ARROW} color={feedColors.pillInk} />
        <Text style={styles.label}>{FEED_NEW_POSTS}</Text>
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs2,
    paddingHorizontal: spacing.sm3,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: feedColors.pillWell,
  },
  label: {
    ...feedTypography.pill,
    color: feedColors.pillInk,
  },
});
