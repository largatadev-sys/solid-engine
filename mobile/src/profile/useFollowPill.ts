import { useEffect, useState } from 'react';
import { useFollowMutation } from '../query/followQueries';
import type { PublicProfileResponse } from '../types/api';
import { followStateFrom, reverted, settled, tapped, type FollowState } from './followState';
import { followToastFor } from './privateProfileCopy';


export interface FollowPillControl {
  readonly shown: FollowState | null;
  readonly onPress: () => void;
  readonly toast: string | null;
  readonly clearToast: () => void;
}


export function useFollowPill(
  profile: PublicProfileResponse | undefined,
  subject: string,
): FollowPillControl {
  const followMutation = useFollowMutation();
  const [follow, setFollow] = useState<FollowState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setFollow(null);
  }, [subject]);

  const served =
    profile === undefined
      ? null
      : followStateFrom(profile.viewerRelation, profile.followersCount, profile.visibility);
  const shown = follow ?? served;

  function onPress() {
    if (profile === undefined || shown === null) {
      return;
    }
    const before = shown;
    const next = tapped(before);
    const intent = next.intent;
    if (intent === null) {
      return;
    }
    setFollow(next.state);

    const handle = profile.traveler.handle;
    followMutation.mutate(
      { travelerId: profile.traveler.id, intent },
      {
        onSuccess: (state) => setFollow(settled(next.state, state)),
        onError: () => {
          setFollow(reverted(before));
          setToast(followToastFor(before, intent, handle));
        },
      },
    );
  }

  return { shown, onPress, toast, clearToast: () => setToast(null) };
}
