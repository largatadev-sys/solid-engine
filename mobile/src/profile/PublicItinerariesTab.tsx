import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { publishedRoute } from '../itineraries/publishedExit';
import { MediaThumb } from '../media/MediaThumb';
import { usePublicShowcase } from '../query/publicProfileQueries';
import { useRevalidateOnFocus } from '../query/useRevalidateOnFocus';
import { colors, spacing } from '../theme';
import {
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import type { ShowcaseItineraryResponse } from '../types/api';
import { PUBLISHED_BADGE } from './profileCopy';
import { PublicProfileEmptyState } from './PublicProfileHeader';
import {
  PUBLIC_ITINERARIES_EMPTY_TITLE,
  SHOW_MORE_LABEL,
  publicItinerariesEmptyBody,
} from './publicProfileCopy';
import { showcaseMetaLine } from './showcaseCard';


interface PublicItinerariesTabProps {
  readonly handle: string;
  readonly displayName: string;
}


export function PublicItinerariesTab({ handle, displayName }: PublicItinerariesTabProps) {
  const router = useRouter();
  const published = usePublicShowcase(handle, true);
  const cards = (published.data?.pages ?? []).flatMap((page) => page.items);

  useRevalidateOnFocus(published);

  if (published.isPending) {
    return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  }

  if (cards.length === 0) {
    return (
      <PublicProfileEmptyState
        title={PUBLIC_ITINERARIES_EMPTY_TITLE}
        body={publicItinerariesEmptyBody(displayName)}
      />
    );
  }

  return (
    <View style={styles.pane}>
      {cards.map((card) => (
        <ShowcaseRow
          key={card.id}
          card={card}
          onPress={() => router.push(publishedRoute('profile', card.id))}
        />
      ))}

      {published.hasNextPage === true && (
        <Pressable
          style={styles.more}
          onPress={() => void published.fetchNextPage()}
          accessibilityRole="button"
          accessibilityLabel={`Show more itineraries from ${displayName}`}
        >
          <Text style={styles.moreLabel}>{SHOW_MORE_LABEL}</Text>
        </Pressable>
      )}
    </View>
  );
}


function ShowcaseRow({
  card,
  onPress,
}: {
  readonly card: ShowcaseItineraryResponse;
  readonly onPress: () => void;
}) {
  const meta = showcaseMetaLine(card.destination, card.durationDays);

  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open the published view of ${card.title}`}
    >
      <MediaThumb
        url={card.coverImageUrl}
        style={styles.thumb}
        fallbackStyle={styles.thumbWell}
        accessibilityLabel={`Cover photo for ${card.title}`}
        fallback={<View />}
      />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {card.title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {meta === null ? PUBLISHED_BADGE : `${meta} · Published`}
        </Text>
      </View>
      <Icon name="chevronRight" size={16} color={profileColors.chevron} />
    </Pressable>
  );
}


const styles = StyleSheet.create({
  pane: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.md,
    gap: spacing.sm3,
  },
  loading: {
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    padding: spacing.sm3,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.sectionRadius,
  },
  thumb: {
    width: profileMetrics.sectionThumb,
    height: profileMetrics.sectionThumb,
    borderRadius: profileMetrics.sectionThumbRadius,
    flexGrow: 0,
    flexShrink: 0,
  },
  thumbWell: {
    backgroundColor: profileColors.avatarWell,
  },
  rowText: {
    flex: 1,
    gap: spacing.hair,
  },
  rowTitle: {
    ...profileTypography.sectionTitle,
    color: workspaceColors.title,
  },
  rowMeta: {
    ...profileTypography.sectionMeta,
    color: profileColors.meta,
  },
  more: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  moreLabel: {
    ...profileTypography.sectionTitle,
    color: workspaceColors.accent,
  },
});
