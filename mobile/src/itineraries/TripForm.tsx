import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { CoverPicker } from '../media/CoverPicker';
import { colors, radii, spacing, typography } from '../theme';
import { addRow, moveRow, removeRow, setRow } from './rowEditor';
import { tripFormChrome, tripFormFields, type TripFormMode, type TripFormValues } from './tripFormContract';


export interface TripFormCover {
  readonly url: string | null;
  readonly busy: boolean;
  readonly uploading?: boolean;
  readonly onPick: () => void;
  readonly onRemove: () => void;
}


interface TripFormProps {
  readonly mode: TripFormMode;
  readonly values: TripFormValues;
  readonly onChange: (next: TripFormValues) => void;
  readonly cover: TripFormCover;
  readonly onSubmit: () => void;
  readonly submitting: boolean;
  readonly submitDisabled?: boolean;
  readonly error?: string;
  readonly backTo?: React.ComponentProps<typeof ScreenHeader>['backTo'];
}


export function TripForm({
  mode,
  values,
  onChange,
  cover,
  onSubmit,
  submitting,
  submitDisabled = false,
  error,
  backTo,
}: TripFormProps) {
  const fields = tripFormFields(mode);
  const chrome = tripFormChrome(mode);

  const set = <K extends keyof TripFormValues>(key: K, value: TripFormValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ScreenHeader title={chrome.headline} size="title" back backTo={backTo} />

        {fields.showsCover ? (
          <CoverPicker
            coverUrl={cover.url}
            busy={cover.busy}
            uploading={cover.uploading ?? false}
            onPick={cover.onPick}
            onRemove={cover.onRemove}
          />
        ) : null}

        <Field
          label="Trip Title"
          value={values.title}
          onChangeText={(text) => set('title', text)}
          placeholder="Name your trip"
        />

        <View style={styles.field}>
          <Text style={styles.label}>Destinations</Text>
          {values.destinations.map((destination, index) => (
            <View key={index} style={styles.rowEntry}>
              <TextInput
                style={styles.rowInput}
                value={destination}
                onChangeText={(text) => set('destinations', setRow(values.destinations, index, text))}
                accessibilityLabel={`Destination ${index + 1}`}
                placeholder="Where to?"
                placeholderTextColor={colors.textSecondary}
              />
              {values.destinations.length > 1 ? (
                <Pressable
                  onPress={() => set('destinations', removeRow(values.destinations, index))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove destination ${index + 1}`}
                  hitSlop={8}
                >
                  <Icon name="minus" size={20} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {fields.destinationsAreMulti ? (
            <Pressable
              style={styles.addRow}
              onPress={() => set('destinations', addRow(values.destinations))}
              accessibilityRole="button"
              accessibilityLabel="Add destination"
            >
              <Icon name="plus" size={20} color={colors.textPrimary} />
              <Text style={styles.addRowText}>Add destination</Text>
            </Pressable>
          ) : null}
        </View>

        {fields.showsDuration ? (
          <View style={styles.rowNarrow}>
            <Field
              label="Duration"
              value={values.duration}
              onChangeText={(text) => set('duration', text)}
              placeholder="Days"
              keyboardType="number-pad"
            />
          </View>
        ) : null}

        <Field
          label="Best Time of Year"
          value={values.bestTimeOfYear}
          onChangeText={(text) => set('bestTimeOfYear', text)}
          placeholder="Best months to go"
        />

        <Field
          label="Trip Description"
          value={values.description}
          onChangeText={(text) => set('description', text)}
          placeholder="What's this trip about?"
          multiline
        />

        <View style={styles.field}>
          <Text style={styles.label}>Standouts</Text>
          {values.standouts.map((standout, index) => (
            <View key={index} style={styles.rowEntry}>
              <TextInput
                style={styles.rowInput}
                value={standout}
                onChangeText={(text) => set('standouts', setRow(values.standouts, index, text))}
                accessibilityLabel={`Standout ${index + 1}`}
                placeholder="Add a standout"
                placeholderTextColor={colors.textSecondary}
              />
              {fields.standoutsReorder ? (
                <>
                  <Pressable
                    onPress={() => set('standouts', moveRow(values.standouts, index, -1))}
                    accessibilityRole="button"
                    accessibilityLabel={`Move standout ${index + 1} up`}
                    hitSlop={8}
                  >
                    <Text style={styles.reorder}>↑</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => set('standouts', moveRow(values.standouts, index, 1))}
                    accessibilityRole="button"
                    accessibilityLabel={`Move standout ${index + 1} down`}
                    hitSlop={8}
                  >
                    <Text style={styles.reorder}>↓</Text>
                  </Pressable>
                </>
              ) : null}
              <Pressable
                onPress={() => set('standouts', removeRow(values.standouts, index))}
                accessibilityRole="button"
                accessibilityLabel={`Remove standout ${index + 1}`}
                hitSlop={8}
              >
                <Icon name="minus" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
          <Pressable
            style={styles.addRow}
            onPress={() => set('standouts', addRow(values.standouts))}
            accessibilityRole="button"
            accessibilityLabel="Add Standout"
          >
            <Icon name="plus" size={20} color={colors.textPrimary} />
            <Text style={styles.addRowText}>Add Standout</Text>
          </Pressable>
        </View>

        {error !== undefined ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.dock}>
        <Pressable
          style={[styles.cta, (submitting || submitDisabled) && styles.ctaBusy]}
          onPress={onSubmit}
          disabled={submitting || submitDisabled}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.ctaText}>{chrome.submitLabel}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}


function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={[styles.input, props.multiline === true && styles.inputMultiline]}
        value={props.value}
        onChangeText={props.onChangeText}
        accessibilityLabel={props.label}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize={props.keyboardType === 'number-pad' ? 'none' : 'sentences'}
        keyboardType={props.keyboardType ?? 'default'}
        multiline={props.multiline ?? false}
      />
    </View>
  );
}


const CTA_HEIGHT = 46;

const MULTILINE_HEIGHT = 108;

const DURATION_WIDTH = 120;

const inputSurface = {
  backgroundColor: colors.surfaceMuted,
  borderWidth: 1,
  borderColor: colors.inputBorder,
  borderRadius: radii.control,
  paddingHorizontal: spacing.sm3,
  paddingVertical: spacing.sm3,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md2,
    flexGrow: 1,
  },
  rowNarrow: { width: DURATION_WIDTH },
  field: { gap: spacing.xs2 },
  label: { ...typography.fieldLabel, color: colors.textSecondary },
  input: { ...inputSurface, ...typography.input, color: colors.textPrimary },
  inputMultiline: { height: MULTILINE_HEIGHT, textAlignVertical: 'top' },
  rowEntry: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowInput: { ...inputSurface, ...typography.input, flex: 1, color: colors.textPrimary },
  reorder: { ...typography.bodyStrong, color: colors.accent },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs2, paddingTop: spacing.xs },
  addRowText: { ...typography.fieldAction, color: colors.textPrimary },
  error: { ...typography.caption, color: colors.danger },
  dock: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  cta: {
    height: CTA_HEIGHT,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  ctaBusy: { opacity: 0.7 },
  ctaText: { ...typography.ctaLabel, color: colors.textOnAccent },
});
