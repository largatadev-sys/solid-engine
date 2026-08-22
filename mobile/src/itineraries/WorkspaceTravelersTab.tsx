import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { confirmWith } from '../components/confirmDestructive';
import {
  leaveTripWording,
  offerOwnershipWording,
  removeMemberWording,
  revokeOwnershipOfferWording,
} from '../components/confirmDestructiveMessage';
import { notify } from '../components/notify';
import { useLayoutClose } from '../members/layoutClose';
import { AddTravelerSheet } from '../members/AddTravelerSheet';
import { cascadeDelayFor } from '../members/cascade';
import { OwnershipOfferCard } from '../members/OwnershipOfferCard';
import { RowEntrance } from '../members/RowEntrance';
import { RowMenuSheet, type RowMenuSubject } from '../members/RowMenuSheet';
import {
  ADD_TRAVELER_LABEL,
  AddTravelerBar,
  InvitedRow,
  MemberRow,
  Notice,
  RequestRow,
  SectionHeading,
} from '../members/TravelerRows';
import {
  addBarVisible,
  handleLabelOf,
  travelerSections,
  type TravelerRowModel,
  type TripPosture,
} from '../members/travelerSections';
import { TRIPS_TAB_ROUTE } from '../navigation/authRoutes';
import { TravelerDialog } from '../profile/TravelerDialog';
import {
  useEndMembership,
  useInviteByHandle,
  useMembers,
  usePendingInvitations,
  useRevokeInvitation,
  useAcceptOwnershipOffer,
  useDeclineOwnershipOffer,
  useOfferOwnership,
  useRevokeOwnershipOffer,
} from '../query/invitationQueries';
import { useApproveRequest, useDeclineRequest, useJoinLink, useJoinRequests } from '../query/joinQueries';
import { useTravelerByHandle } from '../query/travelerQueries';
import { shareLink } from '../itineraries/shareLink';
import { travelerColors } from '../theme/workspaceTokens';
import { trackLinkShared } from '../members/memberEvents';
import type { MemberResponse } from '../types/api';


interface WorkspaceTravelersTabProps {
  readonly itineraryId: string;
  readonly tripTitle: string;
  readonly myId: string | undefined;
  readonly published: boolean;
  readonly archived: boolean;
}


export function WorkspaceTravelersTab({
  itineraryId,
  tripTitle,
  myId,
  published,
  archived,
}: WorkspaceTravelersTabProps) {
  const router = useRouter();
  const posture: TripPosture = archived ? 'archived' : published ? 'published' : 'open';
  const open = posture === 'open';

  const members = useMembers(itineraryId);
  const invitations = usePendingInvitations(itineraryId);
  const roster = useMemo(() => members.data?.items ?? [], [members.data]);
  const viewerIsOwner = roster.some((m) => m.travelerId === myId && m.role === 'owner');
  const requests = useJoinRequests(itineraryId, open && viewerIsOwner);

  const [profileFor, setProfileFor] = useState<MemberResponse | null>(null);
  const [menuFor, setMenuFor] = useState<RowMenuSubject | null>(null);
  const lastMenu = useRef<RowMenuSubject | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState('');

  const visitKey = useTabVisit();
  const closeLayout = useLayoutClose();

  const invite = useInviteByHandle(itineraryId);
  const revokeInvitation = useRevokeInvitation(itineraryId);
  const endMembership = useEndMembership(itineraryId);
  const offerOwnership = useOfferOwnership(itineraryId);
  const revokeOffer = useRevokeOwnershipOffer(itineraryId);
  const acceptOffer = useAcceptOwnershipOffer(itineraryId);
  const declineOffer = useDeclineOwnershipOffer(itineraryId);
  const approve = useApproveRequest(itineraryId);
  const decline = useDeclineRequest(itineraryId);
  const link = useJoinLink(itineraryId);
  const found = useTravelerByHandle(query);

  if (menuFor !== null) lastMenu.current = menuFor;

  const sections = useMemo(
    () =>
      travelerSections({
        roster,
        invited: invitations.data?.items ?? [],
        requests: requests.data?.items ?? [],
        myId,
        posture,
        now: Date.now(),
      }),
    [roster, invitations.data, requests.data, myId, posture],
  );

  const offeredToMe = roster.find((m) => m.travelerId === myId && m.ownershipOffered === true);
  const offerer = roster.find((m) => m.role === 'owner');

  const openSheetFor = useCallback((member: MemberResponse) => setProfileFor(member), []);

  const chooseMenuEntry = (entry: string, subject: RowMenuSubject) => {
    setMenuFor(null);
    const member = roster.find((m) => m.travelerId === subject.travelerId);
    if (member === undefined) return;
    const label = subject.title;

    if (entry === 'remove') {
      confirmWith(removeMemberWording(label), () => {
        closeLayout();
        endMembership.mutate(
          { travelerId: member.travelerId, leaving: false },
          { onError: (error) => notify('Could not remove them', messageFor(error)) },
        );
      });
      return;
    }

    if (entry === 'leave') {
      confirmWith(leaveTripWording(), () => {
        endMembership.mutate(
          { travelerId: member.travelerId, leaving: true },
          {
            onSuccess: () => router.replace(TRIPS_TAB_ROUTE),
            onError: (error) => notify('Could not leave the trip', messageFor(error)),
          },
        );
      });
      return;
    }

    if (entry === 'transfer') {
      confirmWith(offerOwnershipWording(label), () => {
        closeLayout();
        offerOwnership.mutate(member.travelerId, {
          onError: (error) => notify('Could not offer ownership', messageFor(error)),
        });
      });
      return;
    }

    if (entry === 'revokeOffer') {
      confirmWith(revokeOwnershipOfferWording(label), () => {
        closeLayout();
        revokeOffer.mutate(undefined, {
          onError: (error) => notify('Could not revoke the offer', messageFor(error)),
        });
      });
    }
  };

  const share = async () => {
    const url = link.data?.shareUrl;
    if (url === undefined) {
      notify('The invite link is not ready', 'Give it a moment and try again.');
      return;
    }
    trackLinkShared(itineraryId);
    await shareLink({ title: tripTitle, url });
  };

  if (members.isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={travelerColors.accent} />
      </View>
    );
  }

  if (members.isError) {
    return <Notice>Could not load the travelers on this trip.</Notice>;
  }

  let cascadeIndex = 0;
  const nextDelay = () => cascadeDelayFor(cascadeIndex++, false);

  return (
    <View style={styles.tab}>
      <View style={styles.list}>
        {offeredToMe !== undefined && open ? (
          <RowEntrance delayMs={nextDelay()} replayKey={visitKey}>
            <OwnershipOfferCard
              offererLabel={handleLabelOf(offerer?.handle, offerer?.displayName ?? 'The owner')}
              busy={acceptOffer.isPending || declineOffer.isPending}
              onAccept={() =>
                confirmWith(
                  {
                    title: `Become the owner of ${tripTitle}?`,
                    body: 'You take over managing members and ownership. The current owner stays on as a member.',
                    confirmLabel: 'Accept',
                    tone: 'accent',
                  },
                  () => {
                    closeLayout();
                    acceptOffer.mutate(undefined, {
                      onError: (error) => notify('Could not accept ownership', messageFor(error)),
                    });
                  },
                )
              }
              onDecline={() =>
                confirmWith(
                  {
                    title: 'Decline ownership?',
                    body: 'The current owner keeps the trip. They can offer it to you again later.',
                    confirmLabel: 'Decline',
                  },
                  () => {
                    closeLayout();
                    declineOffer.mutate(undefined, {
                      onError: (error) => notify('Could not decline ownership', messageFor(error)),
                    });
                  },
                )
              }
            />
          </RowEntrance>
        ) : null}

        {sections.map((section) => (
          <View key={section.key}>
            <RowEntrance delayMs={nextDelay()} replayKey={visitKey}>
              <SectionHeading heading={section.heading} count={section.count} />
            </RowEntrance>

            {section.rows.map((row) => (
              <RowEntrance
                key={rowKeyOf(row)}
                delayMs={nextDelay()}
                replayKey={visitKey}
              >
                {row.kind === 'member' ? (
                  <MemberRow
                    row={row}
                    onOpenProfile={() => {
                      const member = roster.find((m) => m.travelerId === row.travelerId);
                      if (member !== undefined) openSheetFor(member);
                    }}
                    onOpenMenu={() =>
                      setMenuFor({
                        travelerId: row.travelerId,
                        title: row.title,
                        displayName: row.displayName,
                        viewerIsOwner,
                        isYou: row.isYou,
                        rowIsOwner: row.sub === 'Trip owner',
                        offerPendingOnRow: row.subIsAccent,
                        posture,
                      })
                    }
                  />
                ) : null}

                {row.kind === 'invited' ? (
                  <InvitedRow
                    row={row}
                    onRevoke={() => {
                      closeLayout();
                      revokeInvitation.mutate(row.invitationId, {
                        onError: (error) =>
                          notify('Could not revoke the invitation', messageFor(error)),
                      });
                    }}
                  />
                ) : null}

                {row.kind === 'request' ? (
                  <RequestRow
                    row={row}
                    busy={approve.isPending || decline.isPending}
                    onApprove={() => {
                      closeLayout();
                      approve.mutate(row.requestId, {
                        onError: (error) => notify('Could not approve', messageFor(error)),
                      });
                    }}
                    onDecline={() => {
                      closeLayout();
                      decline.mutate(row.requestId, {
                        onError: (error) => notify('Could not decline', messageFor(error)),
                      });
                    }}
                  />
                ) : null}
              </RowEntrance>
            ))}
          </View>
        ))}
      </View>

      {addBarVisible(posture) ? (
        <RowEntrance delayMs={0} replayKey={visitKey}>
          <AddTravelerBar onPress={() => setSheetOpen(true)} />
        </RowEntrance>
      ) : null}

      <AddTravelerSheet
        open={sheetOpen}
        lookup={{
          looking: query !== '' && found.isFetching,
          found:
            found.data === undefined
              ? null
              : { travelerId: found.data.id, handle: found.data.handle },
          notFound: query !== '' && !found.isFetching && found.data === undefined,
          memberIds: roster.map((m) => m.travelerId),
          invitedIds: (invitations.data?.items ?? [])
            .map((i) => i.inviteeTravelerId)
            .filter((id): id is string => id !== null),
        }}
        foundName={found.data?.displayName ?? null}
        inviting={invite.isPending}
        onQueryChange={setQuery}
        onInvite={(handle) =>
          invite.mutate(handle, {
            onError: (error) => notify('Could not send the invitation', messageFor(error)),
          })
        }
        onShareLink={() => {
          void share();
        }}
        onDismiss={() => setSheetOpen(false)}
      />

      <RowMenuSheet
        subject={menuFor}
        lastSubject={lastMenu.current}
        onSelect={chooseMenuEntry}
        onDismiss={() => setMenuFor(null)}
      />

      <TravelerDialog traveler={profileFor} onDismiss={() => setProfileFor(null)} />
    </View>
  );
}


function rowKeyOf(row: TravelerRowModel): string {
  if (row.kind === 'member') return `m:${row.travelerId}`;
  if (row.kind === 'invited') return `i:${row.invitationId}`;
  return `r:${row.requestId}`;
}


function messageFor(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'MEMBERSHIP_FROZEN') {
    return 'This trip is published, so its travelers are settled. Unpublish it to change who is on the trip.';
  }
  if (code === 'OWNER_CANNOT_LEAVE') {
    return 'Offer ownership to another member and have them accept before leaving this trip.';
  }
  if (code === 'NOT_PERMITTED') return 'Only the trip owner can do that.';
  if (code === 'ITINERARY_NOT_FOUND') return 'This trip is no longer available to you.';
  if (code === 'ALREADY_A_MEMBER') return 'They are already on this trip.';
  if (code === 'TRAVELER_NOT_FOUND') return 'No traveler with that handle.';
  return 'Something went wrong. Try again.';
}


function useTabVisit(): number {
  const [visit, setVisit] = useState(0);
  const played = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!played.current) {
        played.current = true;
        setVisit((at) => at + 1);
      }
      return () => {
        played.current = false;
      };
    }, []),
  );

  return visit;
}


const styles = StyleSheet.create({
  tab: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  centered: {
    padding: 24,
    alignItems: 'center',
  },
});
