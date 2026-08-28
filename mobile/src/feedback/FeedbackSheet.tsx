import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError } from '../api/ApiError';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../components/useReducedMotion';
import { usePhotoAction } from '../media/usePhotoAction';
import type { PickedPhoto } from '../media/pickedPhoto';
import { BottomSheet } from '../members/BottomSheet';
import { MAX_REPORT_SCREENSHOTS, type ReportType } from '../repositories/reportRepository';
import { colors, radii, spacing } from '../theme';
import {
  feedbackColors,
  feedbackMetrics,
  feedbackMotion,
  feedbackTypography,
} from '../theme/workspaceTokens';
import { FeedbackBanner } from './FeedbackBanner';
import {
  DESCRIPTION_PLACEHOLDER,
  descriptionLabel,
  DONE_LABEL,
  RETRY_LABEL,
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
  fieldAtFault,
  guardsDismiss,
  sendEnabled,
  sendLabelFor,
  type FailedAttempt,
  type FeedbackPhase,
  type FieldAtFault,
} from './feedbackForm';
import { FeedbackScreenshots } from './FeedbackScreenshots';
import type { ReportFailure } from './reportFailure';
import type { ReportDraft } from './reportDraft';
import { reportFailureOf, submitReport } from './submitReport';


interface FeedbackSheetProps {
  readonly draft: ReportDraft | null;
  readonly onClose: () => void;
}


export function FeedbackSheet({ draft, onClose }: FeedbackSheetProps) {
  const [type, setType] = useState<ReportType>('problem');
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState<readonly PickedPhoto[]>([]);
  const [phase, setPhase] = useState<FeedbackPhase>('editing');
  const [failure, setFailure] = useState<ReportFailure | null>(null);
  const [atFault, setAtFault] = useState<FieldAtFault>(null);
  const [failedAt, setFailedAt] = useState<FailedAttempt | null>(null);

  const session = useRef(0);
  const live = useRef({ description: '', phase: 'editing' as FeedbackPhase });
  live.current = { description, phase };

  const photos = usePhotoAction();
  const flash = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  const open = draft !== null;

  useEffect(() => {
    if (!open) return;
    session.current += 1;
    setType('problem');
    setDescription('');
    setScreenshots([]);
    setPhase('editing');
    setFailure(null);
    setAtFault(null);
    setFailedAt(null);
  }, [open]);

  const send = () => {
    if (draft === null) return;
    const token = session.current;
    const attempt: FailedAttempt = { description, screenshotCount: screenshots.length };
    setPhase('sending');
    setFailure(null);
    setAtFault(null);

    submitReport(draft, { type, description, screenshots })
      .then(() => {
        if (session.current !== token) return;
        setPhase('sent');
      })
      .catch((thrown: unknown) => {
        if (session.current !== token) return;
        setPhase('failed');
        setFailure(reportFailureOf(thrown));
        setAtFault(fieldAtFault(thrown instanceof ApiError ? thrown.status : null));
        setFailedAt(attempt);
      });
  };

  const close = () => {
    session.current += 1;
    onClose();
  };

  const flashGuard = () => {
    Animated.sequence([
      Animated.timing(flash, {
        toValue: 1,
        duration: reducedMotion ? 0 : feedbackMotion.guardFlashMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.delay(feedbackMotion.guardFlashHoldMs),
      Animated.timing(flash, {
        toValue: 0,
        duration: reducedMotion ? 0 : feedbackMotion.guardFlashMs,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  };

  const attemptDismiss = (): boolean => {
    if (live.current.phase === 'sending') return false;
    if (!guardsDismiss(live.current.phase, live.current.description)) return true;
    flashGuard();
    return false;
  };

  const counter = counterState([...description].length);
  const retryable = failure?.retryable ?? true;
  const canSend = sendEnabled(phase, description, screenshots.length, retryable, failedAt);
  const sending = phase === 'sending';

  const borderColor =
    atFault === 'description'
      ? colors.danger
      : flash.interpolate({
          inputRange: [0, 1],
          outputRange: [colors.inputBorder, colors.danger],
        });

  return (
    <BottomSheet
      open={open}
      title={phase === 'sent' ? '' : SHEET_TITLE}
      onDismiss={close}
      onAttemptDismiss={attemptDismiss}
    >
      {phase === 'sent' ? (
        <ThankYou onDone={close} />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.body}>
            <View style={styles.typeRow}>
              <TypeChip
                label={TYPE_PROBLEM_LABEL}
                selected={type === 'problem'}
                disabled={sending}
                onPress={() => setType('problem')}
              />
              <TypeChip
                label={TYPE_IDEA_LABEL}
                selected={type === 'idea'}
                disabled={sending}
                onPress={() => setType('idea')}
              />
            </View>

            <View style={sending ? styles.dimmed : null}>
              <Text style={styles.fieldLabel}>{descriptionLabel(type)}</Text>
              <Animated.View style={[styles.descriptionFrame, { borderColor }]}>
                <TextInput
                  style={styles.description}
                  value={description}
                  onChangeText={(next) => setDescription(clampToCap(next))}
                  editable={!sending}
                  multiline
                  textAlignVertical="top"
                  placeholder={DESCRIPTION_PLACEHOLDER}
                  placeholderTextColor={colors.textSecondary}
                  accessibilityLabel={descriptionLabel(type)}
                />
              </Animated.View>
              {counter.visible ? (
                <Text
                  style={[
                    styles.counter,
                    counter.atCap && styles.counterAtCap,
                    atFault === 'description' && styles.counterAtFault,
                  ]}
                >
                  {counter.label}
                </Text>
              ) : null}
            </View>

            <View style={sending ? styles.dimmed : null}>
              <FeedbackScreenshots
                picked={screenshots}
                atFault={atFault === 'screenshots'}
                disabled={sending}
                onAdd={() =>
                  void photos.pickManyAndRun(
                    MAX_REPORT_SCREENSHOTS - screenshots.length,
                    async (picked) => {
                      setScreenshots((held) =>
                        [...held, ...picked].slice(0, MAX_REPORT_SCREENSHOTS),
                      );
                    },
                  )
                }
                onRemove={(uri) =>
                  setScreenshots((held) => held.filter((photo) => photo.uri !== uri))
                }
              />
            </View>

            {failure !== null ? <FeedbackBanner message={failure.message} /> : null}

            <Button
              label={sendLabelFor(phase, retryable, SEND_LABEL, RETRY_LABEL)}
              busyLabel={SENDING_LABEL}
              busy={sending}
              disabled={!canSend}
              onPress={send}
            />
          </View>
        </KeyboardAvoidingView>
      )}

      {phase !== 'sent' && !sending ? (
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
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: reducedMotion ? 0 : feedbackMotion.thankYouCrossfadeMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [entrance, reducedMotion]);

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
  descriptionFrame: {
    borderRadius: radii.md,
    borderWidth: 1,
  },
  description: {
    height: feedbackMetrics.descriptionHeight,
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
  counterAtFault: {
    color: colors.danger,
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
