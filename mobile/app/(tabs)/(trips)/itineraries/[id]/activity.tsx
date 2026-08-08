import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../../../../src/components/Icon';
import { TimePicker } from '../../../../../src/components/TimePicker';
import { useMe } from '../../../../../src/hooks/useMe';
import { buildActivityRequest } from '../../../../../src/itineraries/buildActivityRequest';
import { validateActivityForm } from '../../../../../src/itineraries/validateActivityForm';
import {
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../../../../../src/theme/workspaceTokens';
import { useCreateActivity, useEditActivity, useItinerary } from '../../../../../src/query/itineraryQueries';
import { colors, typography } from '../../../../../src/theme';
import type { ActivityResponse, DayResponse } from '../../../../../src/types/api';


export default function ActivityFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, dayId, activityId } = useLocalSearchParams<{ id: string; dayId: string; activityId?: string }>();
  const { data } = useItinerary(id);
  const { state: meState } = useMe();

  const existing = findActivity(data?.days, dayId, activityId);
  const isEdit = activityId !== undefined;

  const create = useCreateActivity(id);
  const edit = useEditActivity(id);
  const mutation = isEdit ? edit : create;

  const homeCurrency = meState.kind === 'ok' ? (meState.me.preferredCurrency ?? '') : '';

  const [title, setTitle] = useState(existing?.title ?? '');
  const [timeOfDay, setTimeOfDay] = useState(existing?.timeOfDay ?? '');
  const [place, setPlace] = useState(existing?.place ?? '');
  const [costAmount, setCostAmount] = useState(existing?.costAmount ?? '');
  const [costCurrency, setCostCurrency] = useState(existing?.costCurrency ?? homeCurrency);
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

    if (isEdit) {
      edit.mutate({ dayId, activityId, request }, { onSuccess: () => router.back() });
    } else {
      create.mutate({ dayId, request }, { onSuccess: () => router.back() });
    }
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

        <Field label="Estimated Price">
          <View style={styles.priceRow}>
            <View style={styles.currencySlot}>
              <TextInput
                style={styles.currencyInput}
                value={costCurrency}
                onChangeText={setCostCurrency}
                placeholder="PHP"
                placeholderTextColor={workspaceColors.placeholder}
                autoCapitalize="characters"
                maxLength={8}
                accessibilityLabel="Currency"
              />
            </View>
            <View style={styles.amountSlot}>
              <Input
                value={costAmount}
                onChangeText={setCostAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                accessibilityLabel="Estimated price"
              />
            </View>
          </View>
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
        {mutation.isError ? <Text style={styles.problem}>{mutation.error.message}</Text> : null}
      </ScrollView>

      <View style={styles.rail}>
        <Pressable
          style={styles.primaryCta}
          onPress={save}
          disabled={mutation.isPending}
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
  accessibilityLabel,
  ...props
}: {
  icon?: IconName;
  accessibilityLabel: string;
} & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.input, focused && styles.inputFocused]}>
      {icon !== undefined ? <Icon name={icon} size={18} color={workspaceColors.accent} /> : null}
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


function findActivity(
  days: DayResponse[] | undefined,
  dayId: string,
  activityId: string | undefined,
): ActivityResponse | undefined {
  if (days === undefined || activityId === undefined) return undefined;
  return days.find((day) => day.id === dayId)?.activities.find((a) => a.id === activityId);
}


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
  priceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencySlot: {
    width: workspaceMetrics.currencyFieldWidth,
  },
  currencyInput: {
    ...workspaceTypography.fieldInput,
    color: workspaceColors.title,
    height: workspaceMetrics.inputHeight,
    borderWidth: 1,
    borderColor: workspaceColors.inputBorder,
    borderRadius: workspaceRadii.control,
    paddingHorizontal: 14,
  },
  amountSlot: {
    flex: 1,
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
