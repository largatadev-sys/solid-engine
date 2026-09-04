import { useEffect, useState } from 'react';
import { useMe } from '../hooks/useMe';
import { useFollowMutation } from '../query/followQueries';
import { usePublicProfile } from '../query/publicProfileQueries';
import { FeedToast } from '../feed/FeedToast';
import { publicProfileMotion } from '../theme/workspaceTokens';
import { creatorPill } from './creatorPill';
import { FollowPill } from './FollowPill';
import { followStateFrom, reverted, settled, tapped, type FollowState } from './followState';
import { followToastFor } from './privateProfileCopy';
import { travelerDestination } from './travelerRoutes';


export function CreatorFollowPill({
  handle,
  displayName,
}: {
  readonly handle: string | null;
  readonly displayName: string | null;
}) {
  const { state } = useMe();
  const viewerHandle = state.kind === 'ok' ? state.me.handle : null;
  const isOwnProfile = travelerDestination(handle, viewerHandle).kind === 'own';

  const profile = usePublicProfile(isOwnProfile || handle === null ? '' : handle);
  const followMutation = useFollowMutation();
  const [follow, setFollow] = useState<FollowState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setFollow(null);
  }, [handle]);

  const served =
    profile.data === undefined
      ? null
      : followStateFrom(
          profile.data.viewerRelation,
          profile.data.followersCount,
          profile.data.visibility,
        );
  const shown = follow ?? served;

  const pill = creatorPill({
    isOwnProfile,
    handle,
    loading: profile.isPending,
    failed: profile.isError,
    relation: shown?.relation,
  });

  if (!pill.shown || profile.data === undefined || shown === null) {
    return null;
  }

  function onPress() {
    if (shown === null || profile.data === undefined) {
      return;
    }
    const before = shown;
    const next = tapped(before);
    const intent = next.intent;
    if (intent === null) {
      return;
    }
    setFollow(next.state);

    followMutation.mutate(
      { travelerId: profile.data.traveler.id, intent },
      {
        onSuccess: (state) => setFollow(settled(next.state, state)),
        onError: () => {
          setFollow(reverted(before));
          setToast(followToastFor(before, intent, profile.data?.traveler.handle ?? null));
        },
      },
    );
  }

  return (
    <>
      <FollowPill
        relation={pill.relation}
        displayName={displayName ?? handle ?? ''}
        onPress={onPress}
        size="compact"
      />
      <FeedToast
        message={toast}
        holdMs={publicProfileMotion.toastHoldMs}
        onDone={() => setToast(null)}
      />
    </>
  );
}
