import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError } from '../../src/api/ApiError';
import { useAuth } from '../../src/hooks/authContext';
import { JoinPostcard } from '../../src/join/JoinPostcard';
import { DEAD_QUIET, LEAVE_LANDING_LABEL, WORDMARK } from '../../src/members/travelerCopy';
import { stripHandoffParam } from '../../src/join/handoffUrl';
import { forgetPendingJoin, stashPendingJoin } from '../../src/join/pendingJoinStore';
import { trackJoinLandingViewed } from '../../src/members/memberEvents';
import { TRIPS_TAB_ROUTE, WELCOME_ROUTE } from '../../src/navigation/authRoutes';
import { joinRepository } from '../../src/repositories/joinRepository';
import { useJoinTeaser, useRequestToJoin } from '../../src/query/joinQueries';
import { VERIFY_CODE_ROUTE } from '../../src/onboarding/onboardingGate';
import {
  travelerColors,
  travelerRadii,
  travelerTypography,
} from '../../src/theme/workspaceTokens';


export default function JoinLandingScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const auth = useAuth();
  const teaser = useJoinTeaser(token);
  const request = useRequestToJoin(token);

  const signedIn = auth.kind === 'signedIn';

  useEffect(() => {
    stripHandoffParam();
  }, []);

  useEffect(() => {
    if (!signedIn) stashPendingJoin(token);
  }, [signedIn, token]);

  useEffect(() => {
    if (teaser.data !== undefined) {
      trackJoinLandingViewed(teaser.data.viewerState, signedIn);
    }
  }, [teaser.data, signedIn]);

  if (teaser.isPending) {
    return (
      <View style={styles.well}>
        <ActivityIndicator color={travelerColors.accent} />
      </View>
    );
  }

  const leaveLanding = () => {
    forgetPendingJoin();
    router.replace(TRIPS_TAB_ROUTE);
  };

  if (teaser.isError || teaser.data === undefined) {
    return <DeadPostcard onLeave={signedIn ? leaveLanding : null} />;
  }

  const state = teaser.data.viewerState;

  const act = () => {
    if (state === 'signedOut') {
      stashPendingJoin(token);
      router.push(WELCOME_ROUTE);
      return;
    }

    if (state === 'member') {
      const itineraryId = teaser.data.itineraryId;
      if (itineraryId === null) return;
      forgetPendingJoin();
      router.replace(`/itineraries/${itineraryId}`);
      return;
    }

    if (state === 'canRequest') {
      request.mutate(undefined, {
        onSuccess: () => forgetPendingJoin(),
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'EMAIL_NOT_VERIFIED') {
            router.push(VERIFY_CODE_ROUTE);
          }
        },
      });
    }
  };

  return (
    <JoinPostcard
      teaser={teaser.data}
      coverUrl={teaser.data.hasCover ? joinRepository.coverPath(token) : null}
      busy={request.isPending}
      onPrimary={act}
      onLeave={signedIn && state !== 'member' ? leaveLanding : null}
    />
  );
}


function DeadPostcard({ onLeave }: { onLeave: (() => void) | null }) {
  return (
    <View style={styles.well}>
      <Text style={styles.wordmark}>{WORDMARK}</Text>
      <View style={styles.card}>
        <View style={styles.quiet}>
          <Text style={styles.quietLabel}>{DEAD_QUIET}</Text>
        </View>
      </View>
      {onLeave === null ? null : (
        <Pressable
          style={styles.leave}
          onPress={onLeave}
          accessibilityRole="button"
          accessibilityLabel={LEAVE_LANDING_LABEL}
        >
          <Text style={styles.leaveLabel}>{LEAVE_LANDING_LABEL}</Text>
        </Pressable>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  well: {
    flex: 1,
    backgroundColor: travelerColors.wellWarm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  wordmark: {
    ...travelerTypography.wordmark,
    color: travelerColors.accent,
    paddingBottom: 14,
  },
  card: {
    width: '100%',
    backgroundColor: travelerColors.surface,
    borderWidth: 1,
    borderColor: travelerColors.accentBorder,
    borderRadius: travelerRadii.postcard,
    overflow: 'hidden',
    padding: 16,
  },
  quiet: {
    backgroundColor: travelerColors.wellNeutral,
    borderWidth: 1,
    borderColor: travelerColors.hairline,
    borderRadius: travelerRadii.card,
    padding: 13,
    alignItems: 'center',
  },
  quietLabel: {
    ...travelerTypography.postcardQuiet,
    color: travelerColors.muted,
    textAlign: 'center',
  },
  leave: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  leaveLabel: {
    ...travelerTypography.postcardQuiet,
    color: travelerColors.muted,
  },
});

export { TRIPS_TAB_ROUTE };
