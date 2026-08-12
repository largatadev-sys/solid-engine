import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { radii, spacing } from '../theme';
import { feedColors, feedMetrics, feedTypography } from '../theme/feedTokens';
import {
  FEED_CAUGHT_UP_BODY,
  FEED_CAUGHT_UP_TITLE,
  FEED_EMPTY_BODY,
  FEED_EMPTY_TITLE,
  FEED_RETRY_LABEL,
  FEED_UNREACHABLE_BODY,
  FEED_UNREACHABLE_TITLE,
} from './feedCopy';

const CHECK_GLYPH = 18;


export function FeedSkeletonCard() {
  return (
    <View style={styles.skeleton} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.skeletonHead}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonLines}>
          <View style={styles.skeletonWide} />
          <View style={styles.skeletonNarrow} />
        </View>
      </View>
      <View style={styles.skeletonPhoto} />
    </View>
  );
}


export function FeedTerminalCard() {
  return (
    <View style={styles.terminal}>
      <View style={styles.disc}>
        <Icon name="check" size={CHECK_GLYPH} color={feedColors.tagInk} />
      </View>
      <Text style={styles.terminalTitle}>{FEED_CAUGHT_UP_TITLE}</Text>
      <Text style={styles.terminalBody}>{FEED_CAUGHT_UP_BODY}</Text>
    </View>
  );
}


export function FeedEmptyState() {
  return (
    <View style={styles.terminal}>
      <View style={styles.disc}>
        <Icon name="globe" size={CHECK_GLYPH} color={feedColors.tagInk} />
      </View>
      <Text style={styles.terminalTitle}>{FEED_EMPTY_TITLE}</Text>
      <Text style={styles.terminalBody}>{FEED_EMPTY_BODY}</Text>
    </View>
  );
}


export function FeedLoadFailed({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <View style={styles.terminal}>
      <View style={styles.disc}>
        <Icon name="info" size={CHECK_GLYPH} color={feedColors.tagInk} />
      </View>
      <Text style={styles.terminalTitle}>{FEED_UNREACHABLE_TITLE}</Text>
      <Text style={styles.terminalBody}>{FEED_UNREACHABLE_BODY}</Text>
      <FeedRetryRow onRetry={onRetry} />
    </View>
  );
}


export function FeedRetryRow({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <Pressable
      style={styles.retry}
      onPress={onRetry}
      accessibilityRole="button"
      accessibilityLabel={FEED_RETRY_LABEL}
    >
      <Text style={styles.retryLabel}>{FEED_RETRY_LABEL}</Text>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  skeleton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: feedColors.skeletonDash,
    borderRadius: feedMetrics.cardRadius,
    padding: spacing.md2,
    gap: spacing.sm3,
  },
  skeletonHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
  },
  skeletonAvatar: {
    width: feedMetrics.avatarSize,
    height: feedMetrics.avatarSize,
    borderRadius: radii.pill,
    backgroundColor: feedColors.skeleton,
  },
  skeletonLines: {
    gap: spacing.xs2,
  },
  skeletonWide: {
    width: 120,
    height: 10,
    borderRadius: 5,
    backgroundColor: feedColors.skeleton,
  },
  skeletonNarrow: {
    width: 80,
    height: 8,
    borderRadius: 4,
    backgroundColor: feedColors.skeleton,
  },
  skeletonPhoto: {
    height: feedMetrics.skeletonPhoto,
    borderRadius: radii.md,
    backgroundColor: feedColors.skeleton,
  },
  terminal: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  disc: {
    width: feedMetrics.caughtUpDisc,
    height: feedMetrics.caughtUpDisc,
    borderRadius: radii.pill,
    backgroundColor: feedColors.caughtUpWell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminalTitle: {
    ...feedTypography.caughtUpTitle,
    color: feedColors.caughtUpTitle,
  },
  terminalBody: {
    ...feedTypography.caughtUpBody,
    color: feedColors.caughtUpBody,
    textAlign: 'center',
    paddingHorizontal: spacing.md2,
  },
  retry: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  retryLabel: {
    ...feedTypography.caughtUpTitle,
    color: feedColors.tagInk,
  },
});
