import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useDiscoveryCount } from '../query/discoveryQueries';
import { colors, spacing } from '../theme';
import {
  discoveryColors,
  discoveryMetrics,
  discoveryTypography,
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import {
  DURATION_BANDS,
  clearedOfFilters,
  differsFromDefaults,
  durationLabel,
  withDestination,
  withDuration,
  type DiscoveryFilters,
  type DurationBand,
} from './discoveryFilters';
import {
  applyButtonLabel,
  FILTER_DESTINATION_LABEL,
  FILTER_DESTINATION_PLACEHOLDER,
  FILTER_DURATION_LABEL,
  FILTERS_RESET_LABEL,
  FILTERS_TITLE,
} from './discoveryCopy';

export function FilterSheet({
  visible,
  applied,
  onApply,
  onDismiss,
}: {
  readonly visible: boolean;
  readonly applied: DiscoveryFilters;
  readonly onApply: (filters: DiscoveryFilters) => void;
  readonly onDismiss: () => void;
}) {
  const [draft, setDraft] = useState<DiscoveryFilters>(applied);

  useEffect(() => {
    if (visible) {
      setDraft(applied);
    }
  }, [visible, applied]);

  const count = useDiscoveryCount(draft, visible);
  const previewed = count.isSuccess ? count.data.count : null;
  const blocked = previewed === 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={styles.scrim}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss filters without applying them"
      />
      <View style={styles.dock}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.titleRow}>
            <Text style={styles.title}>{FILTERS_TITLE}</Text>
            {differsFromDefaults(draft) && (
              <Pressable
                onPress={() => setDraft(clearedOfFilters(draft))}
                accessibilityRole="button"
                accessibilityLabel="Reset these filters"
              >
                <Text style={styles.reset}>{FILTERS_RESET_LABEL}</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.group}>
              <Text style={styles.groupLabel}>{FILTER_DESTINATION_LABEL}</Text>
              <TextInput
                style={styles.field}
                value={draft.destination ?? ""}
                onChangeText={(text) => setDraft(withDestination(draft, text))}
                placeholder={FILTER_DESTINATION_PLACEHOLDER}
                placeholderTextColor={workspaceColors.placeholder}
                accessibilityLabel={FILTER_DESTINATION_LABEL}
                autoCorrect={false}
              />
            </View>

            <View style={styles.group}>
              <Text style={styles.groupLabel}>{FILTER_DURATION_LABEL}</Text>
              <View style={styles.bands}>
                {DURATION_BANDS.map((band: DurationBand) => {
                  const chosen = draft.duration === band;
                  return (
                    <Pressable
                      key={band}
                      style={[styles.band, chosen && styles.bandChosen]}
                      onPress={() =>
                        setDraft(withDuration(draft, chosen ? null : band))
                      }
                      accessibilityRole="button"
                      accessibilityState={{ selected: chosen }}
                      accessibilityLabel={durationLabel(band)}
                    >
                      <Text
                        style={[
                          styles.bandLabel,
                          chosen && styles.bandLabelChosen,
                        ]}
                      >
                        {durationLabel(band)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.apply, blocked && styles.applyBlocked]}
              disabled={blocked}
              onPress={() => onApply(draft)}
              accessibilityRole="button"
              accessibilityState={{ disabled: blocked }}
              accessibilityLabel={applyButtonLabel(previewed)}
            >
              <Text style={styles.applyLabel}>
                {applyButtonLabel(previewed)}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: workspaceColors.scrim,
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: discoveryMetrics.sheetMaxWidth,
    backgroundColor: workspaceColors.surface,
    borderTopLeftRadius: spacing.lg,
    borderTopRightRadius: spacing.lg,
    paddingBottom: spacing.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: discoveryMetrics.grabberWidth,
    height: discoveryMetrics.grabberHeight,
    borderRadius: discoveryMetrics.grabberRadius,
    backgroundColor: profileColors.starMuted,
    marginTop: spacing.sm2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    ...profileTypography.displayName,
    color: workspaceColors.title,
  },
  reset: {
    ...profileTypography.editPill,
    color: colors.accent,
  },
  body: {
    paddingHorizontal: spacing.md2,
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  group: {
    gap: spacing.sm2,
  },
  groupLabel: {
    ...profileTypography.sectionTitle,
    color: workspaceColors.title,
  },
  field: {
    ...discoveryTypography.filterField,
    color: workspaceColors.title,
    backgroundColor: workspaceColors.pressed,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.statsRadius,
    paddingHorizontal: spacing.sm3,
    paddingVertical: spacing.sm3,
  },
  bands: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  band: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm2,
    borderRadius: spacing.sm2,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    backgroundColor: workspaceColors.pressed,
  },
  bandChosen: {
    borderColor: colors.accent,
    backgroundColor: workspaceColors.accentWash,
  },
  bandLabel: {
    ...profileTypography.sectionMeta,
    fontWeight: '700',
    color: profileColors.bio,
  },
  bandLabelChosen: {
    color: colors.accent,
  },
  footer: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.sm,
  },
  apply: {
    backgroundColor: colors.accent,
    borderRadius: profileMetrics.statsRadius,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  applyBlocked: {
    backgroundColor: profileColors.starMuted,
  },
  applyLabel: {
    ...discoveryTypography.applyLabel,
    color: workspaceColors.onAccent,
  },
});
