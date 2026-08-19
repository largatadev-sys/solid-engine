import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { colors, radii, spacing, typography } from '../theme';
import type { ForkedFromResponse } from '../types/api';
import { attributionLabel, attributionLinks } from './forkCopy';


export function AttributionPill({
  forkedFrom,
  onOpenSource,
}: {
  readonly forkedFrom: ForkedFromResponse | null | undefined;

  readonly onOpenSource?: (sourceItineraryId: string) => void;
}) {
  const label = attributionLabel(forkedFrom);
  if (label === undefined || forkedFrom === null || forkedFrom === undefined) return null;

  const source = forkedFrom.sourceItineraryId;

  if (!attributionLinks(forkedFrom) || onOpenSource === undefined) {
    return (
      <View style={styles.pill}>
        <Text style={styles.label}>{label}</Text>
      </View>
    );
  }

  return (
    <Pressable
      style={styles.pill}
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => onOpenSource(source)}
    >
      <Icon name="link" size={LINK_ICON_SIZE} color={colors.textSecondary} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}


const LINK_ICON_SIZE = 14;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs2,
    paddingHorizontal: spacing.sm3,
    paddingVertical: spacing.xs2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: { ...typography.attribution, color: colors.textSecondary },
});
