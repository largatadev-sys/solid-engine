import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MediaThumb } from '../media/MediaThumb';
import { CoverWell } from './CoverWell';
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
import type { TrendingDestinationResponse } from '../types/api';
import {
  SECTION_FAILED,
  SECTION_RETRY_LABEL,
  TRENDING_SECTION_TITLE,
  tripCountLine,
} from './discoveryCopy';

export function TrendingRail({
  destinations,
  loading,
  failed,
  onRetry,
  onOpen,
}: {
  readonly destinations: readonly TrendingDestinationResponse[];
  readonly loading: boolean;
  readonly failed: boolean;
  readonly onRetry: () => void;
  readonly onOpen: (destination: string) => void;
}) {
  if (!loading && !failed && destinations.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{TRENDING_SECTION_TITLE}</Text>
      </View>

      {loading && (
        <ActivityIndicator style={styles.state} color={colors.accent} />
      )}

      {failed && (
        <Pressable
          style={styles.state}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={SECTION_RETRY_LABEL}
        >
          <Text style={styles.failed}>{SECTION_FAILED}</Text>
        </Pressable>
      )}

      {!loading && !failed && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {destinations.map((entry) => (
            <Pressable
              key={entry.destination}
              style={styles.card}
              onPress={() => onOpen(entry.destination)}
              accessibilityRole="button"
              accessibilityLabel={`Browse itineraries in ${entry.destination}, ${tripCountLine(entry.tripCount)}`}
            >
              <MediaThumb
                url={entry.coverImageUrl}
                full
                style={styles.cover}
                fallbackStyle={styles.well}
                accessibilityLabel={`A trip photo from ${entry.destination}`}
                fallback={<CoverWell subject={entry.destination} />}
              />
              <View style={styles.scrim} />
              <View style={styles.caption}>
                <Text style={styles.name} numberOfLines={1}>
                  {entry.destination}
                </Text>
                <Text style={styles.count} numberOfLines={1}>
                  {tripCountLine(entry.tripCount)}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm3,
  },
  header: {
    paddingHorizontal: spacing.md2,
  },
  title: {
    ...discoveryTypography.railTitle,
    color: workspaceColors.title,
  },
  state: {
    paddingHorizontal: spacing.md2,
    paddingVertical: spacing.md,
  },
  failed: {
    ...profileTypography.sectionMeta,
    color: profileColors.meta,
  },
  strip: {
    paddingHorizontal: spacing.md2,
    gap: spacing.sm3,
  },
  card: {
    width: discoveryMetrics.trendingCardWidth,
    height: discoveryMetrics.trendingCardHeight,
    borderRadius: profileMetrics.statsRadius,
    overflow: 'hidden',
    backgroundColor: profileColors.coverWell,
    justifyContent: 'flex-end',
  },
  cover: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  well: {
    ...StyleSheet.absoluteFill,
    backgroundColor: profileColors.coverWell,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundColor: discoveryColors.coverScrim,
  },
  caption: {
    padding: spacing.sm3,
    gap: 2,
  },
  name: {
    ...discoveryTypography.destinationName,
    color: discoveryColors.onCover,
  },
  count: {
    ...profileTypography.sectionMeta,
    color: discoveryColors.onCoverMuted,
  },
});
