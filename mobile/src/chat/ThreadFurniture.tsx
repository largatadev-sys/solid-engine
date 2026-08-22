import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { chatColors, chatCopy, chatMetrics, chatTypography } from '../theme/workspaceTokens';


export function DateSeparator({ label }: { readonly label: string }) {
  return (
    <View style={styles.separator}>
      <View style={styles.rule} />
      <Text style={styles.stamp}>{label}</Text>
      <View style={styles.rule} />
    </View>
  );
}


export function GapTimestamp({ label }: { readonly label: string }) {
  return <Text style={styles.centredStamp}>{label}</Text>;
}


export function ChatEmptyState() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyWell}>
        <Svg
          width={chatMetrics.emptyGlyphSize}
          height={chatMetrics.emptyGlyphSize}
          viewBox="0 0 24 24"
          fill="none"
        >
          <Path
            d="M21 11.5a8.38 8.38 0 0 1-9 8.35 8.5 8.5 0 0 1-3.4-.7L3 20l1.35-4.05A8.38 8.38 0 0 1 3.5 11.5a8.5 8.5 0 1 1 17.5 0z"
            stroke={chatColors.emptyGlyph}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <Text style={styles.emptyBody}>{chatCopy.empty}</Text>
    </View>
  );
}


export function ArchivedNotice() {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeInk}>{chatCopy.archived}</Text>
    </View>
  );
}


export function NewMessagesPill({ onPress }: { readonly onPress: () => void }) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={chatCopy.newMessages}
      hitSlop={chatMetrics.hitSlop}
      style={StyleSheet.flatten([styles.pill, press.style])}
    >
      <Text style={styles.pillInk}>{chatCopy.newMessages}</Text>
    </AnimatedPressable>
  );
}


const styles = StyleSheet.create({
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 2,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: chatColors.hairline,
  },
  stamp: {
    ...chatTypography.stamp,
    color: chatColors.stamp,
    flexShrink: 0,
  },
  centredStamp: {
    ...chatTypography.stamp,
    color: chatColors.stamp,
    textAlign: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyWell: {
    width: chatMetrics.emptyWellSize,
    height: chatMetrics.emptyWellSize,
    borderRadius: chatMetrics.emptyWellSize / 2,
    backgroundColor: chatColors.emptyWell,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyBody: {
    ...chatTypography.emptyBody,
    color: chatColors.emptyBody,
    textAlign: 'center',
    maxWidth: 280,
  },
  notice: {
    borderTopWidth: 1,
    borderTopColor: chatColors.hairline,
    backgroundColor: chatColors.noticeWell,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  noticeInk: {
    ...chatTypography.notice,
    color: chatColors.noticeInk,
    textAlign: 'center',
  },
  pill: {
    alignSelf: 'center',
    backgroundColor: chatColors.pillSurface,
    borderWidth: 1,
    borderColor: chatColors.hairline,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  pillInk: {
    ...chatTypography.action,
    color: chatColors.pillInk,
  },
});
