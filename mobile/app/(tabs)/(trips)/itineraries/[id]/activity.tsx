import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../../../../src/components/Icon';
import { TimePicker } from '../../../../../src/components/TimePicker';
import { useMe } from '../../../../../src/hooks/useMe';
import { buildActivityRequest } from '../../../../../src/itineraries/buildActivityRequest';
import { currencySign } from '../../../../../src/itineraries/currencySign';
import { validateActivityForm } from '../../../../../src/itineraries/validateActivityForm';
import {
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../../../../../src/theme/workspaceTokens';
import { draftOf, stageInto } from '../../../../../src/itineraries/draftStore';
import {
  activityIn,
  createActivity as stageCreateActivity,
  editActivity as stageEditActivity,
  type StagedPlan,
} from '../../../../../src/itineraries/stagedPlan';
import { colors, typography } from '../../../../../src/theme';
import type { ActivityRequest } from '../../../../../src/types/api';


export default function ActivityFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, dayId, activityId } = useLocalSearchParams<{ id: string; dayId: string; activityId?: string }>();
  const { state: meState } = useMe();

  const staged = activityId === undefined ? undefined : activityIn(draftOf(id) ?? emptyPlan, activityId);
  const existing: ActivityRequest | undefined = staged?.fields;
  const isEdit = activityId !== undefined;

  const homeCurrency = meState.kind === 'ok' ? (meState.me.preferredCurrency ?? '') : '';

  const [title, setTitle] = useState(existing?.title ?? '');
  const [timeOfDay, setTimeOfDay] = useState(existing?.timeOfDay ?? '');
  const [place, setPlace] = useState(existing?.place ?? '');
  const [costAmount, setCostAmount] = useState(existing?.costAmount ?? '');
  const costCurrency = existing?.costCurrency ?? homeCurrency;
  const [externalUrl, setExternalUrl] = useState(existing?.externalUrl ?? '');
  const [problem, setProblem] = useState<string | undefined>(undefined);

  const save = () => {
    const complaint = validateActivityForm({ title, timeOfDay, costAmount, costCurrency });
    if (complaint !== undefined) {
      setProblem(complaint);
      return;
    }
    setProblem(undefined);

    const request = buildActivityRequest(
      { title, timeOfDay, place, costAmount, costCurrency, externalUrl },
      existing,
    );

    stageInto(id, (plan) =>
      isEdit
        ? stageEditActivity(plan, activityId, request)
        : stageCreateActivity(plan, dayId, request),
    );
    router.back();
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_PADDING }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Icon name="back" size={24} color={workspaceColors.title} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Activity' : 'Add Activity'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Field label="Activity Name">
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Big Lagoon Kayaking"
            accessibilityLabel="Activity name"
          />
        </Field>

        <TimePicker label="Time" value={timeOfDay} onChange={setTimeOfDay} />

        <Field label="Location / Venue">
          <Input
            icon="mapPin"
            value={place}
            onChangeText={setPlace}
            placeholder="Search for a place..."
            accessibilityLabel="Location or venue"
          />
        </Field>

        <Field label="Estimated Price" optional>
          <Input
            adornment={costCurrency.trim() === '' ? undefined : currencySign(costCurrency)}
            value={costAmount}
            onChangeText={setCostAmount}
            placeholder="Leave empty if you don't know yet"
            keyboardType="decimal-pad"
            accessibilityLabel="Estimated price"
          />
        </Field>

        <Field label="Booking Link" optional>
          <Input
            icon="link"
            value={externalUrl}
            onChangeText={setExternalUrl}
            placeholder="Paste booking URL here..."
            autoCapitalize="none"
            keyboardType="url"
            accessibilityLabel="Booking link"
          />
        </Field>

        {problem !== undefined ? <Text style={styles.problem}>{problem}</Text> : null}
      </ScrollView>

      <View style={styles.rail}>
        <Pressable
          style={styles.primaryCta}
          onPress={save}
          accessibilityRole="button"
          accessibilityLabel="Save Activity"
        >
          <Text style={styles.primaryCtaLabel}>Save Activity</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryCta}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={isEdit ? 'Discard Changes' : 'Cancel'}
        >
          <Text style={styles.secondaryCtaLabel}>{isEdit ? 'Discard Changes' : 'Cancel'}</Text>
        </Pressable>
      </View>
    </View>
  );
}


function Field({
  label,
  optional = false,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (Optional)</Text> : null}
      </Text>
      {children}
    </View>
  );
}


function Input({
  icon,
  adornment,
  accessibilityLabel,
  ...props
}: {
  icon?: IconName;
  adornment?: string;
  accessibilityLabel: string;
} & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.input, focused && styles.inputFocused]}>
      {icon !== undefined ? <Icon name={icon} size={18} color={workspaceColors.accent} /> : null}
      {adornment !== undefined ? <Text style={styles.adornment}>{adornment}</Text> : null}
      <TextInput
        style={styles.inputText}
        accessibilityLabel={accessibilityLabel}
        placeholderTextColor={workspaceColors.placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  );
}


const HEADER_TOP_PADDING = 12;


const emptyPlan: StagedPlan = { basePlanVersion: 0, days: [] };


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    ...workspaceTypography.screenTitle,
    color: workspaceColors.title,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    ...workspaceTypography.fieldLabel,
    color: workspaceColors.fieldLabel,
    textTransform: 'capitalize',
  },
  optional: {
    ...workspaceTypography.fieldOptional,
    fontStyle: 'italic',
    color: workspaceColors.optionalNote,
    textTransform: 'none',
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: workspaceMetrics.inputHeight,
    borderWidth: 1,
    borderColor: workspaceColors.inputBorder,
    borderRadius: workspaceRadii.control,
    paddingHorizontal: 14,
  },
  inputFocused: {
    borderWidth: 1.5,
    borderColor: workspaceColors.accentFocus,
  },
  inputText: {
    ...workspaceTypography.fieldInput,
    color: workspaceColors.title,
    flex: 1,
    padding: 0,
  },
  adornment: {
    ...workspaceTypography.fieldInput,
    color: workspaceColors.muted,
  },
  problem: {
    ...typography.caption,
    color: colors.danger,
  },
  rail: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: workspaceColors.railBorder,
  },
  primaryCta: {
    height: workspaceMetrics.primaryCtaHeight,
    borderRadius: workspaceRadii.control,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaLabel: {
    ...workspaceTypography.ctaPrimary,
    color: workspaceColors.onAccent,
  },
  secondaryCta: {
    height: workspaceMetrics.secondaryCtaHeight,
    borderRadius: workspaceRadii.control,
    borderWidth: 1,
    borderColor: workspaceColors.railBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaLabel: {
    ...workspaceTypography.ctaSecondary,
    color: workspaceColors.secondaryLabel,
  },
});
