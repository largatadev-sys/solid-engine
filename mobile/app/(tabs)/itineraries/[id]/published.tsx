import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../../src/components/Icon';
import {
  copyLink,
  publishedItineraryLink,
  shareLink,
} from '../../../../src/itineraries/shareLink';
import { copyLinkFeedback, shareFeedback } from '../../../../src/itineraries/shareLinkContract';
import { destinationPillLabel, durationLabel } from '../../../../src/itineraries/publishedProjection';
import { usePublishedItinerary } from '../../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../../src/theme';


export default function PublishSuccessScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = usePublishedItinerary(id);
  const [feedback, setFeedback] = useState<string | undefined>();
  const insets = useSafeAreaInsets();

  const url = publishedItineraryLink(id);
  const title = data?.title ?? 'Your itinerary';
  const pill = data === undefined ? undefined : destinationPillLabel(data.destinations);
  const duration = data === undefined ? undefined : durationLabel(data.durationDays);

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.badge}>
        <Icon name="partyPopper" size={BADGE_ICON_SIZE} color={colors.accent} />
      </View>

      <Text style={styles.title}>Your Itinerary is Live!</Text>
      <Text style={styles.body}>
        “{title}” is now available for travelers to discover.
      </Text>

      {data === undefined ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View style={styles.miniCard}>
          <View style={styles.miniThumb}>
            <Icon name="map" size={MINI_ICON_SIZE} color={colors.textSecondary} />
          </View>
          <View style={styles.miniText}>
            <Text style={styles.miniTitle}>{title}</Text>
            <Text style={styles.miniMeta}>
              {[pill, duration].filter((part) => part !== undefined).join(' • ')}
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.shareLabel}>SHARE WITH TRAVELERS</Text>
      <View style={styles.shareRow}>
        <Pressable
          style={styles.shareButton}
          accessibilityRole="button"
          onPress={() => {
            void copyLink(url).then((outcome) => setFeedback(copyLinkFeedback(outcome)));
          }}
        >
          <Icon name="link" size={SHARE_ICON_SIZE} color={colors.accent} />
          <Text style={styles.shareButtonText}>Copy Link</Text>
        </Pressable>
        <Pressable
          style={styles.shareButton}
          accessibilityRole="button"
          onPress={() => {
            void shareLink({ title, url }).then((outcome) => setFeedback(shareFeedback(outcome)));
          }}
        >
          <Icon name="share" size={SHARE_ICON_SIZE} color={colors.accent} />
          <Text style={styles.shareButtonText}>Share to…</Text>
        </Pressable>
      </View>
      {feedback !== undefined && <Text style={styles.feedback}>{feedback}</Text>}

      <Text style={styles.linkPreview}>{url}</Text>

      <Link href={{ pathname: '/published/[id]', params: { id } }} asChild>
        <Pressable style={styles.primary} accessibilityRole="button">
          <Text style={styles.primaryText}>View Published Itinerary</Text>
        </Pressable>
      </Link>
      <Pressable
        style={styles.secondary}
        accessibilityRole="button"
        onPress={() => router.replace({ pathname: '/itineraries/[id]', params: { id } })}
      >
        <Text style={styles.secondaryText}>Back to Trip Workspace</Text>
      </Pressable>
    </ScrollView>
  );
}

const BADGE_SIZE = 72;

const BADGE_ICON_SIZE = 32;

const MINI_THUMB_SIZE = 64;

const MINI_ICON_SIZE = 24;

const SHARE_ICON_SIZE = 18;

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.background,
    flexGrow: 1,
    justifyContent: 'center',
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    alignSelf: 'stretch',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  miniThumb: {
    width: MINI_THUMB_SIZE,
    height: MINI_THUMB_SIZE,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniText: { flexShrink: 1, gap: spacing.xs },
  miniTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  miniMeta: { ...typography.caption, color: colors.textSecondary },
  shareLabel: { ...typography.overline, color: colors.textSecondary, alignSelf: 'flex-start' },
  shareRow: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
  },
  shareButtonText: { ...typography.bodyStrong, color: colors.accent },
  feedback: { ...typography.caption, color: colors.success },
  linkPreview: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  primary: {
    alignSelf: 'stretch',
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  primaryText: { ...typography.bodyStrong, color: colors.textOnAccent },
  secondary: {
    alignSelf: 'stretch',
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
  },
  secondaryText: { ...typography.bodyStrong, color: colors.accent },
});
