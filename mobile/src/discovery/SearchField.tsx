import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { colors, spacing } from '../theme';
import {
  discoveryMetrics,
  discoveryTypography,
  profileColors,
  profileMetrics,
  workspaceColors,
} from '../theme/workspaceTokens';

export const SEARCH_GLYPH = discoveryMetrics.searchFieldGlyph;

export const SEARCH_GLYPH_FOCUSED = discoveryMetrics.searchFieldGlyphFocused;


export function SearchFieldRow({
  onBack,
  backLabel,
  children,
}: {
  readonly onBack?: () => void;
  readonly backLabel?: string;
  readonly children: ReactNode;
}) {
  return (
    <>
      {onBack !== undefined && (
        <View style={styles.backRow}>
          <Pressable
            style={styles.back}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
          >
            <Icon name="back" size={20} color={workspaceColors.title} />
          </Pressable>
        </View>
      )}
      <View style={styles.row}>{children}</View>
    </>
  );
}


export function SearchField({
  label,
  placeholder = false,
  onPress,
  accessibilityLabel,
}: {
  readonly label: string;
  readonly placeholder?: boolean;
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
}) {
  return (
    <Pressable
      style={styles.field}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Icon name="search" size={SEARCH_GLYPH} color={profileColors.meta} />
      <Text style={placeholder ? styles.placeholder : styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}


export const searchFieldStyles = StyleSheet.create({
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm3,
    paddingHorizontal: spacing.md,
    paddingVertical: discoveryMetrics.searchFieldPadding,
    backgroundColor: workspaceColors.pressed,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.statsRadius,
  },
  text: {
    flex: 1,
    ...discoveryTypography.searchField,
    color: workspaceColors.title,
  },
  focusedField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm3,
    paddingHorizontal: spacing.md,
    paddingVertical: discoveryMetrics.searchFieldFocusedPadding,
    backgroundColor: workspaceColors.pressed,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: profileMetrics.statsRadius,
  },
});


const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.sm3,
    paddingBottom: spacing.sm2,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm3,
    paddingTop: spacing.xs2,
  },
  back: {
    width: discoveryMetrics.backButton,
    height: discoveryMetrics.backButton,
    borderRadius: discoveryMetrics.backButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  field: searchFieldStyles.field,
  label: searchFieldStyles.text,
  placeholder: {
    ...searchFieldStyles.text,
    color: profileColors.meta,
  },
});
