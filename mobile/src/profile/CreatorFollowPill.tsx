import { useMe } from '../hooks/useMe';
import { usePublicProfile } from '../query/publicProfileQueries';
import { FeedToast } from '../feed/FeedToast';
import { publicProfileMotion } from '../theme/workspaceTokens';
import { creatorPill } from './creatorPill';
import { FollowPill } from './FollowPill';
import { useFollowPill } from './useFollowPill';
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
  const { shown, onPress, toast, clearToast } = useFollowPill(profile.data, handle ?? '');

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
        onDone={clearToast}
      />
    </>
  );
}
