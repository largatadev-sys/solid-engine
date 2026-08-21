import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { useReducedMotion } from '../components/useReducedMotion';
import {
  chatColors,
  chatCopy,
  chatMetrics,
  chatMotion,
  chatTypography,
} from '../theme/workspaceTokens';
import { canSend, clampToCap, counterState, linesFilled } from './chatThread';
import {
  MEASURES_FROM_A_MIRROR,
  animateComposerGrowth,
  composerFieldTransition,
  naturalContentHeight,
} from './composerGrowth';


interface ComposerProps {
  readonly draft: string;
  readonly onDraftChange: (draft: string) => void;
  readonly onSend: () => void;
  readonly autoFocus: boolean;
}


export function Composer({ draft, onDraftChange, onSend, autoFocus }: ComposerProps) {
  const press = usePressFeedback();
  const reducedMotion = useReducedMotion();
  const [lines, setLines] = useState(1);
  const field = useRef<TextInput | null>(null);
  const ready = canSend(draft);
  const counter = counterState([...draft].length);

  const height = lines * chatMetrics.fieldLineHeight + chatMetrics.fieldPaddingVertical * 2;

  const resize = (reported: number) => {
    const next =
      draft === ''
        ? 1
        : linesFilled(
            naturalContentHeight(field.current, reported),
            chatMetrics.fieldLineHeight,
            chatMetrics.fieldPaddingVertical,
            chatMetrics.fieldMaxLines,
          );
    setLines((current) => {
      if (next !== current && !reducedMotion) animateComposerGrowth();
      return next;
    });
  };

  useEffect(() => {
    if (!MEASURES_FROM_A_MIRROR) return;
    resize(height);
  }, [draft]);

  return (
    <View style={styles.dock}>
      <View style={styles.row}>
        <TextInput
          ref={field}
          value={draft}
          onChangeText={(next) => onDraftChange(clampToCap(next))}
          onContentSizeChange={
            MEASURES_FROM_A_MIRROR
              ? undefined
              : (event) => resize(event.nativeEvent.contentSize.height)
          }
          placeholder={chatCopy.placeholder}
          placeholderTextColor={chatColors.placeholder}
          multiline
          autoFocus={autoFocus}
          scrollEnabled
          maxLength={undefined}
          accessibilityLabel="Message"
          style={StyleSheet.flatten([
            styles.field,
            composerFieldTransition,
            { height: Math.max(height, chatMetrics.fieldMinHeight) },
          ])}
        />

        <SendButton ready={ready} onPress={onSend} press={press} />
      </View>

      {counter.visible ? (
        <CounterLine label={counter.label} atCap={counter.atCap} />
      ) : null}
    </View>
  );
}


function SendButton({
  ready,
  onPress,
  press,
}: {
  readonly ready: boolean;
  readonly onPress: () => void;
  readonly press: ReturnType<typeof usePressFeedback>;
}) {
  const [held, setHeld] = useState(false);
  const fill = useRef(new Animated.Value(ready ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: ready ? 1 : 0,
      duration: chatMotion.stateChangeMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [fill, ready]);

  const backgroundColor = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [chatColors.sendIdle, held ? chatColors.sendPressed : chatColors.sendReady],
  });

  return (
    <AnimatedPressable
      onPress={ready ? onPress : undefined}
      onPressIn={
        ready
          ? () => {
              setHeld(true);
              press.onPressIn();
            }
          : undefined
      }
      onPressOut={
        ready
          ? () => {
              setHeld(false);
              press.onPressOut();
            }
          : undefined
      }
      disabled={!ready}
      accessibilityRole="button"
      accessibilityLabel="Send"
      accessibilityState={{ disabled: !ready }}
      hitSlop={chatMetrics.hitSlop}
      style={StyleSheet.flatten([
        styles.send,
        { backgroundColor, opacity: ready ? press.opacity : 1 },
      ])}
    >
      <SendGlyph ready={ready} />
    </AnimatedPressable>
  );
}


function SendGlyph({ ready }: { readonly ready: boolean }) {
  return (
    <Svg
      width={chatMetrics.sendGlyphSize}
      height={chatMetrics.sendGlyphSize}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M12 19V5M5 12l7-7 7 7"
        stroke={ready ? chatColors.sendReadyGlyph : chatColors.sendIdleGlyph}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}


function CounterLine({ label, atCap }: { readonly label: string; readonly atCap: boolean }) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: chatMotion.stateChangeMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <Animated.Text
      style={[styles.counter, atCap ? styles.counterAtCap : null, { opacity: entrance }]}
    >
      {label}
    </Animated.Text>
  );
}


const styles = StyleSheet.create({
  dock: {
    borderTopWidth: 1,
    borderTopColor: chatColors.hairline,
    paddingVertical: chatMetrics.composerPaddingVertical,
    paddingHorizontal: chatMetrics.composerPaddingHorizontal,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  field: {
    flex: 1,
    minHeight: chatMetrics.fieldMinHeight,
    backgroundColor: chatColors.field,
    borderWidth: 1,
    borderColor: chatColors.fieldBorder,
    borderRadius: chatMetrics.fieldRadius,
    paddingVertical: chatMetrics.fieldPaddingVertical,
    paddingHorizontal: chatMetrics.fieldPaddingHorizontal,
    ...chatTypography.body,
    color: chatColors.bubbleInk,
  },
  send: {
    width: chatMetrics.sendButtonSize,
    height: chatMetrics.sendButtonSize,
    borderRadius: chatMetrics.sendButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    flexShrink: 0,
  },
  counter: {
    ...chatTypography.counter,
    color: chatColors.counter,
    textAlign: 'right',
    paddingRight: chatMetrics.sendButtonSize + 20,
  },
  counterAtCap: {
    color: chatColors.counterAtCap,
  },
});
