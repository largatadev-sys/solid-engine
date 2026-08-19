import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DatePicker } from '../../../../../../src/components/DatePicker';
import { Icon } from '../../../../../../src/components/Icon';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TimePicker } from '../../../../../../src/components/TimePicker';
import {
  MAX_OPTION_LENGTH,
  MAX_QUESTION_LENGTH,
  createFormValidity,
  defaultDeadline,
} from '../../../../../../src/polls/pollBoard';
import {
  instantOfParts,
  isInTheFuture,
  partsOfInstant,
} from '../../../../../../src/polls/pollDeadline';
import {
  POLL_ADD_OPTION_LABEL,
  POLL_CLOSES_HELPER,
  POLL_CLOSES_LABEL,
  POLL_CREATE_CANCEL_LABEL,
  POLL_CREATE_SUBMIT_LABEL,
  POLL_OPTIONS_HELPER,
  POLL_OPTIONS_LABEL,
  POLL_OPTION_PLACEHOLDER,
  POLL_QUESTION_LABEL,
  POLL_QUESTION_PLACEHOLDER,
  POLL_REMOVE_OPTION_LABEL,
  POLLS_CREATE_CTA,
  pollErrorMessage,
} from '../../../../../../src/polls/pollMessages';
import { useCreatePoll } from '../../../../../../src/query/pollQueries';
import { colors, radii, spacing, typography } from '../../../../../../src/theme';
import {
  pollColors,
  pollTypography,
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
} from '../../../../../../src/theme/workspaceTokens';


const DEADLINE_IN_THE_PAST = 'Pick a moment in the future for this poll to close.';


export default function CreatePollScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const create = useCreatePoll(id);

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [deadline, setDeadline] = useState(() => partsOfInstant(defaultDeadline(Date.now())));
  const [failure, setFailure] = useState<string | null>(null);

  const form = createFormValidity(question, options);
  const closesAt = instantOfParts(deadline);
  const deadlineOk = isInTheFuture(closesAt, Date.now());
  const submittable = form.valid && deadlineOk && !create.isPending;

  const setOptionAt = (index: number, value: string) => {
    setOptions((current) => current.map((option, at) => (at === index ? value : option)));
  };

  const removeOptionAt = (index: number) => {
    setOptions((current) => current.filter((_option, at) => at !== index));
  };

  const submit = () => {
    if (closesAt === null) return;
    setFailure(null);
    create.mutate(
      { question: form.submittable.question, options: form.submittable.options, closesAt },
      {
        onSuccess: () => router.back(),
        onError: (error: Error) => setFailure(pollErrorMessage(error)),
      },
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ScreenHeader
        title={POLLS_CREATE_CTA}
        back
        backTo={{ pathname: '/itineraries/[id]', params: { id, tab: 'polls' } }}
      />

      <View style={styles.field}>
        <Text style={styles.label}>{POLL_QUESTION_LABEL}</Text>
        <TextInput
          style={styles.input}
          value={question}
          onChangeText={setQuestion}
          placeholder={POLL_QUESTION_PLACEHOLDER}
          placeholderTextColor={workspaceColors.placeholder}
          maxLength={MAX_QUESTION_LENGTH}
          accessibilityLabel={POLL_QUESTION_LABEL}
        />
      </View>

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{POLL_OPTIONS_LABEL}</Text>
          <Text style={styles.helper}>{POLL_OPTIONS_HELPER}</Text>
        </View>

        {options.map((option, index) => (
          <View key={`option-${index}`} style={styles.optionRow}>
            <TextInput
              style={[styles.input, styles.optionInput]}
              value={option}
              onChangeText={(value) => setOptionAt(index, value)}
              placeholder={`${POLL_OPTION_PLACEHOLDER} ${index + 1}`}
              placeholderTextColor={workspaceColors.placeholder}
              maxLength={MAX_OPTION_LENGTH}
              accessibilityLabel={`${POLL_OPTION_PLACEHOLDER} ${index + 1}`}
            />
            {form.canRemoveOption && (
              <Pressable
                onPress={() => removeOptionAt(index)}
                accessibilityRole="button"
                accessibilityLabel={`${POLL_REMOVE_OPTION_LABEL} ${index + 1}`}
                hitSlop={8}
                style={styles.trash}
              >
                <Icon name="trash" size={16} color={workspaceColors.muted} />
              </Pressable>
            )}
          </View>
        ))}

        {form.canAddOption && (
          <Pressable
            style={styles.addOption}
            onPress={() => setOptions((current) => [...current, ''])}
            accessibilityRole="button"
            accessibilityLabel={POLL_ADD_OPTION_LABEL}
          >
            <Icon name="plus" size={14} color={workspaceColors.accent} />
            <Text style={styles.addOptionLabel}>{POLL_ADD_OPTION_LABEL}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.settingsCard}>
        <Text style={styles.label}>{POLL_CLOSES_LABEL}</Text>
        <DatePicker
          label="Date"
          value={deadline.date}
          onChange={(date) => setDeadline((current) => ({ ...current, date }))}
        />
        <TimePicker
          label="Time"
          value={deadline.time}
          onChange={(time) => setDeadline((current) => ({ ...current, time }))}
        />
        <Text style={styles.helper}>{POLL_CLOSES_HELPER}</Text>
        {!deadlineOk && <Text style={styles.failure}>{DEADLINE_IN_THE_PAST}</Text>}
      </View>

      {failure !== null && <Text style={styles.failure}>{failure}</Text>}

      <Pressable
        style={[styles.submit, !submittable && styles.disabled]}
        disabled={!submittable}
        onPress={submit}
        accessibilityRole="button"
        accessibilityLabel={POLL_CREATE_SUBMIT_LABEL}
      >
        <Text style={styles.submitLabel}>
          {create.isPending ? 'Creating…' : POLL_CREATE_SUBMIT_LABEL}
        </Text>
      </Pressable>

      <Pressable
        style={styles.cancel}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={POLL_CREATE_CANCEL_LABEL}
      >
        <Text style={styles.cancelLabel}>{POLL_CREATE_CANCEL_LABEL}</Text>
      </Pressable>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.lg,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  field: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    ...typography.fieldLabel,
    color: workspaceColors.fieldLabel,
  },
  helper: {
    ...pollTypography.hint,
    color: workspaceColors.muted,
    flexShrink: 0,
  },
  input: {
    minHeight: workspaceMetrics.inputHeight,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: workspaceRadii.card,
    paddingHorizontal: spacing.sm3,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    ...typography.input,
    color: colors.textPrimary,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionInput: {
    flex: 1,
  },
  trash: {
    padding: spacing.xs,
    flexShrink: 0,
  },
  addOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  addOptionLabel: {
    ...pollTypography.progressLabel,
    color: workspaceColors.accent,
  },
  settingsCard: {
    gap: spacing.sm3,
    padding: spacing.sm3,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: workspaceRadii.card,
    backgroundColor: colors.surface,
  },
  failure: {
    ...pollTypography.hint,
    color: pollColors.danger,
  },
  submit: {
    height: workspaceMetrics.primaryCtaHeight,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: workspaceColors.title,
  },
  submitLabel: {
    ...typography.ctaLabel,
    color: workspaceColors.onAccent,
  },
  cancel: {
    height: workspaceMetrics.secondaryCtaHeight,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
  },
  cancelLabel: {
    ...typography.ctaLabel,
    color: workspaceColors.title,
  },
  disabled: {
    opacity: 0.45,
  },
});
