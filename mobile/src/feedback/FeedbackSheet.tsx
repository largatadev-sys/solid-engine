import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { BottomSheet } from '../members/BottomSheet';
import type { ReportType } from '../repositories/reportRepository';
import { colors, radii, spacing } from '../theme';
import {
  feedbackColors,
  feedbackMetrics,
  feedbackMotion,
  feedbackTypography,
} from '../theme/workspaceTokens';
import {
  DESCRIPTION_PLACEHOLDER,
  descriptionLabel,
  DONE_LABEL,
  SEND_LABEL,
  SENDING_LABEL,
  SHEET_CLOSE_LABEL,
  SHEET_TITLE,
  THANK_YOU_BODY,
  THANK_YOU_TITLE,
  TYPE_IDEA_LABEL,
  TYPE_PROBLEM_LABEL,
} from './feedbackCopy';
import {
  clampToCap,
  counterState,
  sendEnabled,
  type FeedbackPhase,
} from './feedbackForm';
import type { ReportDraft } from './reportDraft';
import { submitReport } from './submitReport';


interface FeedbackSheetProps {
  readonly draft: ReportDraft | null;
  readonly onClose: () => void;
}


export function FeedbackSheet({ draft, onClose }: FeedbackSheetProps) {
  const [type, setType] = useState<ReportType>('problem');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<FeedbackPhase>('editing');
  const session = useRef(0);

  const open = draft !== null;

  useEffect(() => {
    if (!open) return;
    session.current += 1;
    setType('problem');
    setDescription('');
    setPhase('editing');
  }, [open]);

  const send = () => {
    if (draft === null) return;
    const token = session.current;
    setPhase('sending');

    submitReport(draft, { type, description, screenshots: [] })
      .then(() => {
        if (session.current !== token) return;
        setPhase('sent');
      })
      .catch(() => {
        if (session.current !== token) return;
        setPhase('editing');
      });
  };

  const close = () => {
    session.current += 1;
    onClose();
  };

  const counter = counterState([...description].length);
  const canSend = sendEnabled(phase, description, 0, true, null);

  return (
    <BottomSheet open={open} title={phase === 'sent' ? '' : SHEET_TITLE} onDismiss={close}>
      {phase === 'sent' ? (
        <ThankYou onDone={close} />
      ) : (
        <View style={styles.body}>
          <View style={styles.typeRow}>
            <TypeChip
              label={TYPE_PROBLEM_LABEL}
              selected={type === 'problem'}
              disabled={phase === 'sending'}
              onPress={() => setType('problem')}
            />
            <TypeChip
              label={TYPE_IDEA_LABEL}
              selected={type === 'idea'}
              disabled={phase === 'sending'}
              onPress={() => setType('idea')}
            />
          </View>

          <View style={phase === 'sending' ? styles.dimmed : null}>
            <Text style={styles.fieldLabel}>{descriptionLabel(type)}</Text>
            <TextInput
              style={styles.description}
              value={description}
              onChangeText={(next) => setDescription(clampToCap(next))}
              editable={phase !== 'sending'}
              multiline
              textAlignVertical="top"
              placeholder={DESCRIPTION_PLACEHOLDER}
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel={descriptionLabel(type)}
            />
            {counter.visible ? (
              <Text style={[styles.counter, counter.atCap && styles.counterAtCap]}>
                {counter.label}
              </Text>
            ) : null}
          </View>

          <Button
            label={SEND_LABEL}
            busyLabel={SENDING_LABEL}
            busy={phase === 'sending'}
            disabled={!canSend}
            onPress={send}
          />
        </View>
      )}

      {phase !== 'sent' && phase !== 'sending' ? (
        <Pressable
          style={styles.close}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={SHEET_CLOSE_LABEL}
        >
          <Icon name="close" size={feedbackMetrics.closeGlyph} color={colors.textPrimary} />
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}


function TypeChip({
  label,
  selected,
  disabled,
  onPress,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
    >
      <Text style={selected ? styles.chipLabelSelected : styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}


function ThankYou({ onDone }: { readonly onDone: () => void }) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: feedbackMotion.thankYouCrossfadeMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <Animated.View style={[styles.thankYou, { opacity: entrance }]}>
      <View style={styles.thankYouDisc}>
        <Icon name="checkCircle" size={feedbackMetrics.thankYouGlyph} color={colors.success} />
      </View>
      <Text style={styles.thankYouTitle}>{THANK_YOU_TITLE}</Text>
      <Text style={styles.thankYouBody}>{THANK_YOU_BODY}</Text>
      <Button label={DONE_LABEL} onPress={onDone} style={styles.done} />
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.md,
    gap: spacing.md2,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    height: feedbackMetrics.chipHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.accentTint,
    borderColor: colors.accent,
  },
  chipLabel: {
    ...feedbackTypography.chip,
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    ...feedbackTypography.chip,
    color: colors.accent,
  },
  dimmed: {
    opacity: feedbackMotion.dimmedOpacity,
  },
  fieldLabel: {
    ...feedbackTypography.fieldLabel,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    height: feedbackMetrics.descriptionHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    ...feedbackTypography.description,
    color: colors.textPrimary,
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    ...feedbackTypography.counter,
    color: feedbackColors.counter,
  },
  counterAtCap: {
    color: feedbackColors.counterAtCap,
  },
  close: {
    position: 'absolute',
    top: 14,
    right: spacing.md2,
    width: feedbackMetrics.closeDisc,
    height: feedbackMetrics.closeDisc,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thankYou: {
    alignItems: 'center',
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.sm,
  },
  thankYouDisc: {
    width: feedbackMetrics.thankYouDisc,
    height: feedbackMetrics.thankYouDisc,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thankYouTitle: {
    ...feedbackTypography.thankYouTitle,
    color: colors.textPrimary,
    marginTop: 36,
  },
  thankYouBody: {
    ...feedbackTypography.thankYouBody,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: feedbackMetrics.thankYouBodyMaxWidth,
    marginTop: spacing.sm,
  },
  done: {
    marginTop: 36,
  },
});
