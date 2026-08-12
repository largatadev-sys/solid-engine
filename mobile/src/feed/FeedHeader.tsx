import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { radii, spacing } from '../theme';
import { feedColors, feedMetrics, feedTypography } from '../theme/feedTokens';
import { FEED_NOTIFICATIONS_LABEL, FEED_SEARCH_LABEL, FEED_TITLE } from './feedCopy';


interface FeedHeaderProps {
  readonly onSearch: () => void;
  readonly onNotifications: () => void;
}


export function FeedHeader({ onSearch, onNotifications }: FeedHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.wordmark}>{FEED_TITLE}</Text>

      <View style={styles.actions}>
        <Pressable
          style={styles.iconButton}
          onPress={onSearch}
          accessibilityRole="button"
          accessibilityLabel={FEED_SEARCH_LABEL}
        >
          <Icon name="search" size={feedMetrics.glyph} color={feedColors.caption} />
        </Pressable>

        <Pressable
          style={styles.iconButton}
          onPress={onNotifications}
          accessibilityRole="button"
          accessibilityLabel={FEED_NOTIFICATIONS_LABEL}
        >
          <Icon name="bell" size={feedMetrics.glyph} color={feedColors.caption} />
          <View style={styles.unread} />
        </Pressable>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: feedMetrics.headerPadding,
    paddingVertical: spacing.sm3,
    backgroundColor: feedColors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.headerRule,
  },
  wordmark: {
    ...feedTypography.wordmark,
    color: feedColors.authorName,
    letterSpacing: -0.3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: feedMetrics.iconButton,
    height: feedMetrics.iconButton,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unread: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: feedColors.tagInk,
    borderWidth: 1.5,
    borderColor: feedColors.cardSurface,
  },
});
