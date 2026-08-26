import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing } from '../theme';
import { feedColors, feedMetrics } from '../theme/feedTokens';
import {
  followColors,
  followMetrics,
  followTypography,
  workspaceColors,
  workspaceRadii,
} from '../theme/workspaceTokens';
import { FEED_SCOPE_ALL, FEED_SCOPE_FOLLOWING } from './feedCopy';
import type { FeedScope } from './feedScope';


interface FeedScopeChipsProps {
  readonly scope: FeedScope;
  readonly onSelect: (scope: FeedScope) => void;
}


export function FeedScopeChips({ scope, onSelect }: FeedScopeChipsProps) {
  const chips: ReadonlyArray<{ key: FeedScope; label: string }> = [
    { key: 'all', label: FEED_SCOPE_ALL },
    { key: 'following', label: FEED_SCOPE_FOLLOWING },
  ];

  return (
    <View style={styles.row}>
      {chips.map((chip) => {
        const active = chip.key === scope;
        return (
          <Pressable
            key={chip.key}
            style={StyleSheet.flatten([styles.chip, active ? styles.chipActive : styles.chipIdle])}
            onPress={() => onSelect(chip.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            aria-selected={active}
            accessibilityLabel={chip.label}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelIdle]}>
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}


const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: feedMetrics.headerPadding,
    paddingTop: spacing.sm3,
    paddingBottom: spacing.xs,
    backgroundColor: feedColors.cardSurface,
  },
  chip: {
    height: followMetrics.filterChipHeight,
    paddingHorizontal: spacing.md,
    borderRadius: workspaceRadii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: workspaceColors.accent,
    borderColor: workspaceColors.accent,
  },
  chipIdle: {
    backgroundColor: followColors.filterIdleWell,
    borderColor: followColors.filterIdleBorder,
  },
  label: {
    ...followTypography.filterChip,
  },
  labelActive: {
    color: feedColors.onPill,
  },
  labelIdle: {
    color: followColors.filterIdleInk,
  },
});
