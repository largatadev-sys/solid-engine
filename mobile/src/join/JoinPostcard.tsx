import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { useReducedMotion } from '../components/useReducedMotion';
import { MediaThumb } from '../media/MediaThumb';
import { compactDateRange } from '../members/invitationCard';
import {
  travelerColors,
  travelerMetrics,
  travelerMotion,
  travelerRadii,
  travelerTypography,
} from '../theme/workspaceTokens';
import type { JoinTeaserResponse } from '../types/api';

import {
  DEAD_COVER_OPACITY,
  DEAD_QUIET,
  KICKER,
  LEAVE_LANDING_LABEL,
  MEMBER_CTA,
  PENDING_QUIET,
  REQUEST_CTA,
  SIGNED_OUT_CTA,
  WORDMARK,
} from '../members/travelerCopy';


export function teaserMetaLine(teaser: {
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  travelerCount: number;
}): string {
  const parts: string[] = [];
  if (teaser.destination !== null && teaser.destination !== '') parts.push(teaser.destination);

  const dates = compactDateRange(teaser.startDate, teaser.endDate);
  if (dates !== null) parts.push(dates);

  parts.push(`${teaser.travelerCount} ${teaser.travelerCount === 1 ? 'traveler' : 'travelers'}`);
  return parts.join(' · ');
}


interface JoinPostcardProps {
  readonly teaser: JoinTeaserResponse;
  readonly coverUrl: string | null;
  readonly busy: boolean;
  readonly onPrimary: () => void;
  readonly onLeave: (() => void) | null;
}


export function JoinPostcard({
  teaser,
  coverUrl,
  busy,
  onPrimary,
  onLeave,
}: JoinPostcardProps) {
  const entrance = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  const dead = teaser.viewerState === 'dead';

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: reducedMotion ? 0 : travelerMotion.postcardInMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [entrance, reducedMotion]);

  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [travelerMotion.postcardRisePx, 0],
  });

  return (
    <View style={styles.well}>
      <Text style={styles.wordmark}>{WORDMARK}</Text>

      <Animated.View
        style={[styles.card, { opacity: entrance, transform: [{ translateY }] }]}
      >
        <View style={styles.cover}>
          {coverUrl === null ? null : (
            <MediaThumb
              url={coverUrl}
              style={{
                width: '100%',
                height: travelerMetrics.postcardCover,
                opacity: dead ? DEAD_COVER_OPACITY : 1,
              }}
              accessibilityLabel="Trip cover photo"
              fallback={<View />}
            />
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.kicker}>{KICKER}</Text>
          <Text style={styles.title}>{teaser.title}</Text>
          <Text style={styles.meta}>{teaserMetaLine(teaser)}</Text>
        </View>

        <View style={styles.actions}>
          <PostcardAction state={teaser.viewerState} busy={busy} onPress={onPrimary} />
        </View>
      </Animated.View>

      {onLeave === null ? null : (
        <Animated.View style={{ opacity: entrance, transform: [{ translateY }] }}>
          <LeaveLanding onPress={onLeave} />
        </Animated.View>
      )}
    </View>
  );
}


function LeaveLanding({ onPress }: { onPress: () => void }) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={[styles.leave, { opacity: press.opacity }]}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={LEAVE_LANDING_LABEL}
    >
      <Text style={styles.leaveLabel}>{LEAVE_LANDING_LABEL}</Text>
    </AnimatedPressable>
  );
}


function PostcardAction({
  state,
  busy,
  onPress,
}: {
  state: JoinTeaserResponse['viewerState'];
  busy: boolean;
  onPress: () => void;
}) {
  const press = usePressFeedback();
  const label = ctaLabelFor(state);

  if (label === null) {
    return (
      <View style={styles.quiet}>
        <Text style={styles.quietLabel}>
          {state === 'pending' ? PENDING_QUIET : DEAD_QUIET}
        </Text>
      </View>
    );
  }

  return (
    <AnimatedPressable
      style={[styles.cta, { opacity: press.opacity }]}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
      accessibilityLabel={label}
    >
      {busy ? (
        <ActivityIndicator size="small" color={travelerColors.onAccent} />
      ) : (
        <Text style={styles.ctaLabel}>{label}</Text>
      )}
    </AnimatedPressable>
  );
}


export function ctaLabelFor(state: JoinTeaserResponse['viewerState']): string | null {
  if (state === 'signedOut') return SIGNED_OUT_CTA;
  if (state === 'canRequest') return REQUEST_CTA;
  if (state === 'member') return MEMBER_CTA;
  return null;
}


const styles = StyleSheet.create({
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
    shadowColor: travelerColors.accentDark,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 36,
    elevation: 8,
  },
  cover: {
    height: travelerMetrics.postcardCover,
    backgroundColor: travelerColors.coverWell,
    overflow: 'hidden',
  },
  body: {
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 4,
    gap: 3,
    alignItems: 'center',
  },
  kicker: {
    ...travelerTypography.postcardKicker,
    color: travelerColors.accentDark,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  title: {
    ...travelerTypography.postcardTitle,
    color: travelerColors.ink,
    textAlign: 'center',
  },
  meta: {
    ...travelerTypography.postcardMeta,
    color: travelerColors.muted,
    textAlign: 'center',
  },
  actions: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  cta: {
    backgroundColor: travelerColors.accent,
    borderRadius: travelerRadii.card,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: travelerMetrics.avatarHit,
  },
  ctaLabel: {
    ...travelerTypography.postcardCta,
    color: travelerColors.onAccent,
  },
  quiet: {
    backgroundColor: travelerColors.wellNeutral,
    borderWidth: 1,
    borderColor: travelerColors.hairline,
    borderRadius: travelerRadii.card,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quietLabel: {
    ...travelerTypography.postcardQuiet,
    color: travelerColors.muted,
    textAlign: 'center',
  },
});
