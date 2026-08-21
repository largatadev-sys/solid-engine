import { Animated, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { MediaThumb } from '../media/MediaThumb';
import { useFailureDim } from './useFailureDim';
import {
  chatAvatarTints,
  chatColors,
  chatMetrics,
  chatTypography,
} from '../theme/workspaceTokens';
import { authorLabel, avatarLabel, tintIndexFor, type ThreadMessage } from './chatThread';


interface MessageBubbleProps {
  readonly message: ThreadMessage;
  readonly startsGroup: boolean;
  readonly endsGroup: boolean;
}


export function MessageBubble({ message, startsGroup, endsGroup }: MessageBubbleProps) {
  const failure = useFailureDim(message.state === 'failed');

  const bubble = (
    <Animated.View
      accessibilityLabel={`${authorLabel(message)}: ${message.body}`}
      style={StyleSheet.flatten([
        styles.bubble,
        message.mine ? styles.bubbleMine : styles.bubbleOther,
        cornersFor(message.mine, endsGroup),
        { opacity: failure },
      ])}
    >
      <Text selectable style={styles.body}>
        {message.body}
      </Text>
    </Animated.View>
  );

  if (message.mine) {
    return <View style={styles.mineRow}>{bubble}</View>;
  }

  return (
    <View style={styles.otherRow}>
      {endsGroup ? <Avatar message={message} /> : <View style={styles.avatarSpacer} />}
      <View style={styles.otherColumn}>
        {startsGroup ? <Text style={styles.handle}>{authorLabel(message)}</Text> : null}
        {bubble}
      </View>
    </View>
  );
}


function Avatar({ message }: { readonly message: ThreadMessage }) {
  const tint = chatAvatarTints[tintIndexFor(message.authorId, chatAvatarTints.length)];

  return (
    <MediaThumb
      url={message.avatarUrl}
      style={styles.avatar}
      accessibilityLabel={`${authorLabel(message)}'s profile photo`}
      fallbackStyle={{ backgroundColor: tint?.well }}
      fallback={<Text style={[styles.initials, { color: tint?.ink }]}>{avatarLabel(message)}</Text>}
    />
  );
}


function cornersFor(mine: boolean, endsGroup: boolean): ViewStyle {
  if (!endsGroup) return {};
  return mine
    ? { borderBottomRightRadius: chatMetrics.bubbleSenderCorner }
    : { borderBottomLeftRadius: chatMetrics.bubbleSenderCorner };
}


const styles = StyleSheet.create({
  otherRow: {
    flexDirection: 'row',
    gap: chatMetrics.avatarGap,
    alignItems: 'flex-end',
  },
  otherColumn: {
    flex: 1,
    alignItems: 'flex-start',
    gap: chatMetrics.intraGroupGap,
  },
  mineRow: {
    alignItems: 'flex-end',
  },
  avatar: {
    width: chatMetrics.avatarSize,
    height: chatMetrics.avatarSize,
    borderRadius: chatMetrics.avatarSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarSpacer: {
    width: chatMetrics.avatarSize,
    flexShrink: 0,
  },
  initials: {
    ...chatTypography.initials,
  },
  handle: {
    ...chatTypography.handle,
    color: chatColors.handle,
    paddingLeft: 2,
  },
  bubble: {
    maxWidth: chatMetrics.bubbleMaxWidth,
    borderRadius: chatMetrics.bubbleRadius,
    borderWidth: 1,
    paddingVertical: chatMetrics.bubblePaddingVertical,
    paddingHorizontal: chatMetrics.bubblePaddingHorizontal,
  },
  bubbleOther: {
    backgroundColor: chatColors.bubbleOther,
    borderColor: chatColors.bubbleOtherBorder,
  },
  bubbleMine: {
    backgroundColor: chatColors.bubbleMine,
    borderColor: chatColors.bubbleMineBorder,
  },
  body: {
    ...chatTypography.body,
    color: chatColors.bubbleInk,
  },
});
