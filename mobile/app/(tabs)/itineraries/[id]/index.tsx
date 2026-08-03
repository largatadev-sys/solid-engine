import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { comingSoon } from '../../../../src/components/comingSoon';
import { Icon } from '../../../../src/components/Icon';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { confirmWith } from '../../../../src/components/confirmDestructive';
import { notify } from '../../../../src/components/notify';
import {
  leaveTripWording,
  unpublishTripWording,
} from '../../../../src/components/confirmDestructiveMessage';
import { itineraryLoadMessage, ScreenMessage } from '../../../../src/components/ScreenMessage';
import { useMe } from '../../../../src/hooks/useMe';
import { dayHeading } from '../../../../src/itineraries/dayHeading';
import { AvatarStack } from '../../../../src/itineraries/AvatarStack';
import { formatDates } from '../../../../src/itineraries/formatDates';
import {
  audienceBlurb,
  audienceLabel,
  audienceOf,
  canPublish,
  isEditable,
  PUBLISH_NEEDS_COMPLETE_TITLE,
  publishNeedsCompleteBody,
  lifecycleBlurb,
  lifecycleLabel,
  nextLifecycleAct,
  otherAudience,
  publishControl,
  workspaceEyebrow,
} from '../../../../src/itineraries/publishControls';
import { TripArchiveBanner } from '../../../../src/itineraries/TripArchiveBanner';
import { WorkspaceChip } from '../../../../src/itineraries/WorkspaceChip';
import { memberControls } from '../../../../src/members/memberControls';
import { OwnershipOfferBanner } from '../../../../src/members/OwnershipOfferBanner';
import { useEndMembership, useMembers } from '../../../../src/query/invitationQueries';
import {
  useItinerary,
  useShowTripTo,
  useTripLifecycle,
  useUnpublishTrip,
} from '../../../../src/query/itineraryQueries';
import type { LifecycleAct } from '../../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../../src/theme';
import type {
  DayResponse,
  ItineraryResponse,
  PublishAudience,
} from '../../../../src/types/api';


const EYEBROW_ICON_SIZE = 20;

const EDIT_ICON_SIZE = 22;


type WorkspaceTab = 'itinerary' | 'details';


export default function TripWorkspaceScreen() {
  const router = useRouter();
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { data, isPending, isError, error } = useItinerary(id);

  const members = useMembers(id);
  const { state: meState } = useMe();
  const myId = meState.kind === 'ok' ? meState.me.id : undefined;
  const roster = members.data?.items ?? [];
  const { isOwner, canInvite, canLeave } = memberControls(roster, myId, data?.archived ?? false);

  const endMembership = useEndMembership(id);
  const unpublish = useUnpublishTrip(id);
  const showTo = useShowTripTo(id);
  const lifecycle = useTripLifecycle(id);
  const [active, setActive] = useState<WorkspaceTab>(tab === 'details' ? 'details' : 'itinerary');

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    return <ScreenMessage {...itineraryLoadMessage(error, 'Could not load this trip')} />;
  }

  const leaveTrip = () => {
    if (myId === undefined) return;
    confirmWith(leaveTripWording(), () => {
      endMembership.mutate({ travelerId: myId, leaving: true }, { onSuccess: () => router.replace('/') });
    });
  };

  const control = publishControl(data, isOwner);
  const eyebrow = workspaceEyebrow(data);
  const audience = audienceOf(data);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>

        <ScreenHeader
          title={data.title}
          size="display"
          back
          eyebrow={
            <View style={styles.eyebrowRow}>
              <Icon name={eyebrow.icon} size={EYEBROW_ICON_SIZE} color={colors.accent} />
              <Text style={styles.eyebrow}>{eyebrow.label}</Text>
            </View>
          }
          action={
            isEditable(data) ? (
              <Link
                href={{ pathname: '/itineraries/[id]/days', params: { id, day: '1' } }}
                asChild
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit itinerary"
                  hitSlop={spacing.sm}
                >
                  <Icon name="pencil" size={EDIT_ICON_SIZE} color={colors.textPrimary} />
                </Pressable>
              </Link>
            ) : undefined
          }
        />

        <View style={styles.identityRow}>
          <Link href={{ pathname: '/members/[itineraryId]', params: { itineraryId: id } }} asChild>
            <Pressable
              style={styles.rosterLink}
              accessibilityRole="button"
              accessibilityLabel={`${roster.length} members`}
            >
              <AvatarStack roster={roster} />
              <Text style={styles.rosterCount}>
                {roster.length} {roster.length === 1 ? 'member' : 'members'}
              </Text>
            </Pressable>
          </Link>
          <WorkspaceChip itinerary={data} />
        </View>

        <TripArchiveBanner itinerary={data} />
        <OwnershipOfferBanner itineraryId={id} />

        <View style={styles.tabBar}>
          <WorkspaceTabButton
            label="Itinerary"
            selected={active === 'itinerary'}
            onPress={() => setActive('itinerary')}
          />
          <WorkspaceTabButton label="Chat" selected={false} greyed onPress={() => comingSoon('chat')} />
          <WorkspaceTabButton
            label="Details"
            selected={active === 'details'}
            onPress={() => setActive('details')}
          />
        </View>

        {active === 'itinerary' ? (
          <ItineraryTab itineraryId={id} days={data.days} />
        ) : (
          <DetailsTab
            itinerary={data}
            isOwner={isOwner}
            canLeave={canLeave}
            leaving={endMembership.isPending}
            onLeave={leaveTrip}
            canUnpublish={control === 'unpublish'}
            unpublishing={unpublish.isPending}
            unpublishError={unpublish.isError ? unpublish.error.message : undefined}
            onUnpublish={() => confirmWith(unpublishTripWording(), () => unpublish.mutate())}
            audience={audience}
            changingAudience={showTo.isPending}
            onChangeAudience={() => showTo.mutate(otherAudience(audience))}
            lifecycleBusy={lifecycle.isPending}
            lifecycleError={lifecycle.isError ? lifecycle.error.message : undefined}
            onLifecycle={(act) => lifecycle.mutate(act)}
          />
        )}
      </ScrollView>

      {(canInvite || control === 'publish') && (
        <View style={styles.actionBar}>
          {control === 'publish' &&
            (canPublish(data) ? (
              <Link href={{ pathname: '/itineraries/[id]/preview', params: { id } }} asChild>
                <Pressable style={styles.cta} accessibilityRole="button">
                  <Text style={styles.ctaText}>Publish Itinerary</Text>
                </Pressable>
              </Link>
            ) : (
              <Pressable
                style={styles.cta}
                accessibilityRole="button"
                onPress={() =>
                  notify(PUBLISH_NEEDS_COMPLETE_TITLE, publishNeedsCompleteBody(data.state))
                }
              >
                <Text style={styles.ctaText}>Publish Itinerary</Text>
              </Pressable>
            ))}
          {canInvite && (
            <Link href={{ pathname: '/itineraries/[id]/invite', params: { id } }} asChild>
              <Pressable
                style={control === 'publish' ? styles.secondaryCta : styles.cta}
                accessibilityRole="button"
              >
                <Text style={control === 'publish' ? styles.secondaryCtaText : styles.ctaText}>
                  Invite Travelers
                </Text>
              </Pressable>
            </Link>
          )}
        </View>
      )}
    </View>
  );
}


function ItineraryTab({ itineraryId, days }: { itineraryId: string; days: DayResponse[] }) {
  if (days.length === 0) {
    return (
      <View style={styles.tabBody}>
        <Text style={styles.caption}>No days yet. Open the planner to build this trip out.</Text>
        <Link href={{ pathname: '/itineraries/[id]/days', params: { id: itineraryId, day: '1' } }} asChild>
          <Pressable style={styles.secondaryAction} accessibilityRole="button">
            <Text style={styles.secondaryActionText}>Open the planner</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.tabBody}>
      {days.map((day) => (
        <Link
          key={day.id}
          href={{
            pathname: '/itineraries/[id]/days/[dayId]',
            params: { id: itineraryId, dayId: day.id },
          }}
          asChild
        >
          <Pressable style={styles.dayCard} accessibilityRole="button">
            <Text style={styles.dayCardTitle}>{dayHeading(day)}</Text>
            <Text style={styles.dayCardMeta}>
              {day.activities.length} {day.activities.length === 1 ? 'activity' : 'activities'}
            </Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}


function DetailsTab(props: {
  itinerary: ItineraryResponse;
  isOwner: boolean;
  canLeave: boolean;
  leaving: boolean;
  onLeave: () => void;
  canUnpublish: boolean;
  unpublishing: boolean;
  unpublishError: string | undefined;
  onUnpublish: () => void;
  audience: PublishAudience;
  changingAudience: boolean;
  onChangeAudience: () => void;
  lifecycleBusy: boolean;
  lifecycleError: string | undefined;
  onLifecycle: (act: LifecycleAct) => void;
}) {
  const { itinerary } = props;
  const pinned = itinerary.published;

  return (
    <View style={styles.tabBody}>
      <View style={styles.detailsHeader}>
        <Text style={styles.sectionLabel}>Trip details</Text>
        {isEditable(itinerary) && (
          <Link href={{ pathname: '/itineraries/[id]/edit', params: { id: itinerary.id } }} asChild>
            <Pressable accessibilityRole="button" hitSlop={spacing.sm}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </Link>
        )}
      </View>

      {itinerary.description !== null && (
        <Field label="Description">
          <Text style={styles.value}>{itinerary.description}</Text>
        </Field>
      )}

      <Field label="Destinations">
        {itinerary.destinations.map((destination) => (
          <Text key={destination} style={styles.value}>
            {destination}
          </Text>
        ))}
      </Field>

      <Field label="Dates">
        <Text style={styles.value}>{formatDates(itinerary)}</Text>
      </Field>

      {props.isOwner && (
        <Field label="Where this trip is">
          <Text style={styles.value}>{lifecycleLabel(itinerary.state)}</Text>
          <Text style={styles.caption}>
            {pinned
              ? 'A published trip is fixed. Unpublish it to move it along again.'
              : lifecycleBlurb(itinerary.state)}
          </Text>
          {props.lifecycleBusy ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            !pinned && (
              <View style={styles.lifecycleRow}>
                {nextLifecycleAct(itinerary.state) && (
                  <Pressable
                    style={styles.secondaryAction}
                    accessibilityRole="button"
                    onPress={() => props.onLifecycle(nextLifecycleAct(itinerary.state)!.act)}
                  >
                    <Text style={styles.secondaryActionText}>
                      {nextLifecycleAct(itinerary.state)!.label}
                    </Text>
                  </Pressable>
                )}
                {itinerary.state !== 'draft' && (
                  <Pressable
                    style={styles.secondaryAction}
                    accessibilityRole="button"
                    onPress={() => props.onLifecycle('reopen')}
                  >
                    <Text style={styles.secondaryActionText}>Step back</Text>
                  </Pressable>
                )}
              </View>
            )
          )}
          {props.lifecycleError !== undefined && (
            <Text style={styles.errorCaption}>{props.lifecycleError}</Text>
          )}
        </Field>
      )}

      {props.isOwner && (
        <Field label="Who can read this">
          <Text style={styles.value}>{audienceLabel(props.audience)}</Text>
          <Text style={styles.caption}>{audienceBlurb(props.audience)}</Text>
          {props.changingAudience ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Pressable
              style={styles.secondaryAction}
              accessibilityRole="button"
              onPress={props.onChangeAudience}
            >
              <Text style={styles.secondaryActionText}>
                Make it {audienceLabel(otherAudience(props.audience)).toLowerCase()}
              </Text>
            </Pressable>
          )}
        </Field>
      )}

      {props.canUnpublish && (
        <View style={styles.quiet}>
          {props.unpublishing ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : (
            <Pressable accessibilityRole="button" onPress={props.onUnpublish}>
              <Text style={styles.quietText}>Unpublish this trip</Text>
            </Pressable>
          )}
          {props.unpublishError !== undefined && (
            <Text style={styles.errorCaption}>{props.unpublishError}</Text>
          )}
        </View>
      )}

      {props.canLeave && (
        <Pressable
          style={[styles.leaveButton, props.leaving && styles.busy]}
          onPress={props.onLeave}
          disabled={props.leaving}
          accessibilityRole="button"
        >
          <Text style={styles.leaveButtonText}>{props.leaving ? 'Leaving…' : 'Leave trip'}</Text>
        </Pressable>
      )}
    </View>
  );
}


function WorkspaceTabButton(props: {
  label: string;
  selected: boolean;
  greyed?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tabButton, props.selected && styles.tabButtonSelected]}
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: props.selected, disabled: props.greyed === true }}
      accessibilityLabel={props.greyed === true ? `${props.label}, coming soon` : props.label}
    >
      <Text
        style={[
          styles.tabButtonText,
          props.selected && styles.tabButtonTextSelected,
          props.greyed === true && styles.tabButtonTextGreyed,
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

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
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrow: { ...typography.label, color: colors.accent },
  title: { ...typography.title, color: colors.textPrimary },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rosterLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  rosterCount: { ...typography.caption, color: colors.textSecondary },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tabButtonSelected: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabButtonText: { ...typography.body, color: colors.textSecondary },
  tabButtonTextSelected: { color: colors.accent, fontWeight: '700' },
  tabButtonTextGreyed: { opacity: 0.6 },
  tabBody: { gap: spacing.md, paddingTop: spacing.sm },
  dayCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayCardTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  dayCardMeta: { ...typography.caption, color: colors.textSecondary },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editLink: { ...typography.bodyStrong, color: colors.accent },
  field: { gap: spacing.xs },
  sectionLabel: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.body, color: colors.textPrimary },
  lifecycleRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  secondaryAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
  },
  secondaryActionText: { ...typography.bodyStrong, color: colors.accent },
  leaveButton: { paddingVertical: spacing.sm, alignItems: 'flex-start' },
  leaveButtonText: { ...typography.caption, color: colors.danger },
  actionBar: { flexDirection: 'row', gap: spacing.sm, margin: spacing.md },
  cta: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  ctaText: { ...typography.bodyStrong, color: colors.textOnAccent },
  secondaryCta: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
  },
  secondaryCtaText: { ...typography.bodyStrong, color: colors.accent },
  quiet: { alignItems: 'flex-start', gap: spacing.xs },
  quietText: { ...typography.caption, color: colors.textSecondary, textDecorationLine: 'underline' },
  errorCaption: { ...typography.caption, color: colors.danger },
  busy: { opacity: 0.7 },
  caption: { ...typography.caption, color: colors.textSecondary },
});
