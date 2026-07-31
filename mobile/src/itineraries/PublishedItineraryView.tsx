import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { comingSoon } from '../components/comingSoon';
import type { ComingSoonSurface } from '../components/comingSoonMessage';
import { Icon } from '../components/Icon';
import { colors, radii, spacing, typography } from '../theme';
import type { PublishedActivityResponse, PublishedItineraryResponse } from '../types/api';
import { dayHeading } from './dayHeading';
import { initialsFor } from '../onboarding/initials';
import {
  bylineHandle,
  destinationPillLabel,
  durationLabel,
  estimatedTotalLabel,
} from './publishedProjection';


export const PUBLISHED_TABS = ['Overview', 'Day-by-Day', 'Diary Entry', 'Comments', 'Reviews'] as const;

export type PublishedTab = (typeof PUBLISHED_TABS)[number];


const GREYED_TABS: Partial<Record<PublishedTab, ComingSoonSurface>> = {
  'Diary Entry': 'diary',
  Comments: 'comments',
  Reviews: 'reviews',
};


export function PublishedItineraryView({
  projection,
  audience,
}: {
  projection: PublishedItineraryResponse;

  audience: 'preview' | 'consumer';
}) {
  const [tab, setTab] = useState<PublishedTab>('Overview');

  return (
    <View style={styles.page}>
      <PublishedHeader projection={projection} audience={audience} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarRow}
      >
        {PUBLISHED_TABS.map((label) => (
          <Pressable
            key={label}
            style={[styles.tab, tab === label && styles.tabSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === label, disabled: label in GREYED_TABS }}
            accessibilityLabel={label in GREYED_TABS ? `${label}, coming soon` : label}
            onPress={() => {
              const surface = GREYED_TABS[label];
              if (surface !== undefined) {
                comingSoon(surface);
                return;
              }
              setTab(label);
            }}
          >
            <Text
              style={[
                styles.tabText,
                tab === label && styles.tabTextSelected,
                label in GREYED_TABS && styles.tabTextGreyed,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'Overview' ? <Overview projection={projection} /> : <DayByDay projection={projection} />}
    </View>
  );
}


function PublishedHeader({
  projection,
  audience,
}: {
  projection: PublishedItineraryResponse;
  audience: 'preview' | 'consumer';
}) {
  const pill = destinationPillLabel(projection.destinations);
  const duration = durationLabel(projection.durationDays);
  const total = estimatedTotalLabel(projection.estimatedCost);
  const handle = bylineHandle(projection.creator.handle);

  return (
    <View style={styles.header}>
      <View style={styles.pillRow}>
        {pill !== undefined && (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{pill}</Text>
          </View>
        )}
        {duration !== undefined && <Text style={styles.duration}>{duration}</Text>}
        {projection.bestTimeOfYear !== null && (
          <Text style={styles.bestTime}>{projection.bestTimeOfYear}</Text>
        )}
      </View>

      <View style={styles.creatorRow}>
        <View style={styles.creatorAvatar}>
          <Text style={styles.creatorInitials}>
            {initialsFor(projection.creator.displayName, null)}
          </Text>
        </View>
        <View style={styles.creatorNames}>
          <Text style={styles.creatorName}>{projection.creator.displayName}</Text>
          {handle !== undefined && <Text style={styles.creatorHandle}>{handle}</Text>}
        </View>
        {audience === 'consumer' && (
          <Pressable
            style={styles.followButton}
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel="Follow, coming soon"
            onPress={() => comingSoon('follow')}
          >
            <Icon name="plus" size={FOLLOW_ICON_SIZE} color={colors.textSecondary} />
            <Text style={styles.followText}>Follow</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.title}>{projection.title}</Text>

      <View style={styles.stats}>
        <Pressable
          style={styles.stat}
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel="Rating, coming soon"
          onPress={() => comingSoon('rating')}
        >
          <Text style={styles.statValueGreyed}>—</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </Pressable>
        <Pressable
          style={styles.stat}
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel="Forks, coming soon"
          onPress={() => comingSoon('fork')}
        >
          <Text style={styles.statValueGreyed}>—</Text>
          <Text style={styles.statLabel}>Forked</Text>
        </Pressable>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{total ?? '—'}</Text>
          <Text style={styles.statLabel}>Est. Total</Text>
        </View>
      </View>
    </View>
  );
}


function Overview({ projection }: { projection: PublishedItineraryResponse }) {
  return (
    <View style={styles.body}>
      <Pressable
        style={styles.gallery}
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessibilityLabel="Photo gallery, coming soon"
        onPress={() => comingSoon('activityPhoto')}
      >
        <Text style={styles.galleryHint}>Photos coming soon</Text>
      </Pressable>

      {projection.description !== null && <Text style={styles.description}>{projection.description}</Text>}

      {projection.standouts.length > 0 && (
        <View style={styles.standouts}>
          <Text style={styles.standoutsHeading}>Standouts</Text>
          {projection.standouts.map((standout) => (
            <View key={standout} style={styles.standoutRow}>
              <Icon name="checkCircle" size={STANDOUT_ICON_SIZE} color={colors.accent} />
              <Text style={styles.standoutText}>{standout}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}


function DayByDay({ projection }: { projection: PublishedItineraryResponse }) {
  if (projection.days.length === 0) {
    return (
      <View style={styles.body}>
        <Text style={styles.caption}>This itinerary has no days yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      {projection.days.map((day) => (
        <View key={day.id} style={styles.dayBlock}>
          <Text style={styles.dayTitle}>{dayHeading(day)}</Text>
          {day.activities.length === 0 ? (
            <Text style={styles.caption}>Nothing planned for this day.</Text>
          ) : (
            day.activities.map((activity) => <ActivityCard key={activity.id} activity={activity} />)
          )}
        </View>
      ))}
    </View>
  );
}


function ActivityCard({ activity }: { activity: PublishedActivityResponse }) {
  return (
    <View style={styles.activityCard}>
      <Text style={styles.activityTitle}>{activity.title}</Text>
      {activity.place !== null && <Text style={styles.activityPlace}>{activity.place}</Text>}
      {activity.notes !== null && (
        <View style={styles.tips}>
          <Text style={styles.tipsLabel}>Creator tip</Text>
          <Text style={styles.tipsBody}>{activity.notes}</Text>
        </View>
      )}
      {activity.externalUrl !== null && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel="View booking options, coming soon"
          onPress={() => comingSoon('booking')}
        >
          <Text style={styles.bookingLinkGreyed}>View Booking Options</Text>
        </Pressable>
      )}
    </View>
  );
}

const FOLLOW_ICON_SIZE = 14;

const CREATOR_AVATAR_SIZE = 36;

const STANDOUT_ICON_SIZE = 18;

const styles = StyleSheet.create({
  page: { gap: spacing.md },
  header: { gap: spacing.sm },
  pillRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
  },
  pillText: { ...typography.overline, color: colors.textOnAccent },
  duration: { ...typography.label, color: colors.textSecondary },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  creatorAvatar: {
    width: CREATOR_AVATAR_SIZE,
    height: CREATOR_AVATAR_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorInitials: { ...typography.label, color: colors.accent },
  creatorNames: { flex: 1 },
  creatorName: { ...typography.label, color: colors.textPrimary },
  creatorHandle: { ...typography.caption, color: colors.textSecondary },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.6,
  },
  followText: { ...typography.caption, color: colors.textSecondary },
  title: { ...typography.display, color: colors.textPrimary },
  stats: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statValue: { ...typography.bodyStrong, color: colors.textPrimary },
  statValueGreyed: { ...typography.bodyStrong, color: colors.textSecondary, opacity: 0.6 },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  tabBar: { borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 },
  tabBarRow: { flexDirection: 'row' },
  tab: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  tabSelected: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { ...typography.caption, color: colors.textSecondary },
  tabTextSelected: { color: colors.accent, fontWeight: '700' },
  tabTextGreyed: { opacity: 0.6 },
  body: { gap: spacing.md },
  gallery: {
    height: 132,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  galleryHint: { ...typography.caption, color: colors.textSecondary },
  description: { ...typography.body, color: colors.textPrimary, lineHeight: 26 },
  bestTime: { ...typography.caption, color: colors.textSecondary },
  standouts: { gap: spacing.sm },
  standoutsHeading: { ...typography.bodyStrong, color: colors.textPrimary },
  standoutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  standoutText: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  caption: { ...typography.caption, color: colors.textSecondary },
  dayBlock: { gap: spacing.sm },
  dayTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  activityCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  activityTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  activityPlace: { ...typography.caption, color: colors.textSecondary },
  tips: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.accentTint,
  },
  tipsLabel: { ...typography.overline, color: colors.accent },
  tipsBody: { ...typography.caption, color: colors.textPrimary },
  bookingLinkGreyed: { ...typography.label, color: colors.textSecondary, opacity: 0.6 },
});
