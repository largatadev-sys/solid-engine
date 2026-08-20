import { TRIPS_TAB_ROUTE } from '../../../../../src/navigation/authRoutes';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../../../src/components/Icon';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { itineraryLoadMessage, ScreenMessage } from '../../../../../src/components/ScreenMessage';
import { PublishedItineraryView } from '../../../../../src/itineraries/PublishedItineraryView';
import { audienceBlurb, audienceLabel } from '../../../../../src/itineraries/publishControls';
import type { PublishAudience } from '../../../../../src/types/api';
import {
  useItinerary,
  useItineraryPreview,
  usePublishTrip,
} from '../../../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../../../src/theme';


export default function ItineraryPreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, error } = useItineraryPreview(id);
  const trip = useItinerary(id);
  const publish = usePublishTrip(id);
  const [audience, setAudience] = useState<PublishAudience>('public');
  const state = trip.data?.state;
  const readyToPublish = state === 'completed' && trip.data?.published === false;

  const continueEditing = () =>
    router.push({ pathname: '/itineraries/[id]/edit-plan', params: { id } });

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    return <ScreenMessage {...itineraryLoadMessage(error, 'Could not load this preview')} />;
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Preview" back backTo={{ pathname: TRIPS_TAB_ROUTE }} />

        <View style={styles.banner}>
          <Icon name="eye" size={BANNER_ICON_SIZE} color={colors.accent} />
          <Text style={styles.bannerText}>
            This is a preview of your itinerary page — what other travelers will see if you publish.
          </Text>
        </View>

        <PublishedItineraryView projection={data} audience="preview" />
      </ScrollView>

      {readyToPublish ? (
      <View style={styles.footer}>
        <View style={styles.audienceRow}>
          {AUDIENCES.map((option) => (
            <Pressable
              key={option}
              style={[styles.audienceChip, audience === option && styles.audienceChipSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected: audience === option }}
              accessibilityLabel={`Publish ${audienceLabel(option).toLowerCase()}`}
              onPress={() => setAudience(option)}
            >
              <Text
                style={[
                  styles.audienceChipText,
                  audience === option && styles.audienceChipTextSelected,
                ]}
              >
                {audienceLabel(option)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.audienceBlurb}>{audienceBlurb(audience)}</Text>

        {publish.isError && <Text style={styles.error}>{publish.error.message}</Text>}
        <Pressable
          style={[styles.primary, publish.isPending && styles.busy]}
          disabled={publish.isPending}
          accessibilityRole="button"
          onPress={() =>
            publish.mutate(audience, {
              onSuccess: () =>
                router.replace({ pathname: '/itineraries/[id]/published', params: { id } }),
            })
          }
        >
          {publish.isPending ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.primaryText}>Publish Itinerary</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.secondary}
          accessibilityRole="button"
          onPress={continueEditing}
        >
          <Text style={styles.secondaryText}>Continue Editing</Text>
        </Pressable>
      </View>
      ) : (
        <View style={styles.footer}>
          <Pressable
            style={styles.primary}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/itineraries/[id]', params: { id } })}
          >
            <Text style={styles.primaryText}>Open Trip Workspace</Text>
          </Pressable>
          <Pressable
            style={styles.secondary}
            accessibilityRole="button"
            onPress={continueEditing}
          >
            <Text style={styles.secondaryText}>Continue Editing</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const BANNER_ICON_SIZE = 18;

const AUDIENCES: readonly PublishAudience[] = ['public', 'private'] as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.accentTint,
  },
  bannerText: { ...typography.caption, color: colors.accent, flexShrink: 1 },
  footer: { padding: spacing.md, gap: spacing.sm },
  audienceRow: { flexDirection: 'row', gap: spacing.sm },
  audienceChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  audienceChipSelected: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  audienceChipText: { ...typography.bodyStrong, color: colors.textSecondary },
  audienceChipTextSelected: { color: colors.accent },
  audienceBlurb: { ...typography.caption, color: colors.textSecondary },
  primary: {
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  primaryText: { ...typography.bodyStrong, color: colors.textOnAccent },
  secondary: {
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
  },
  secondaryText: { ...typography.bodyStrong, color: colors.accent },
  busy: { opacity: 0.7 },
  error: { ...typography.caption, color: colors.danger },
});
