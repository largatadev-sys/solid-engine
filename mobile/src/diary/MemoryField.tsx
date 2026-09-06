import type { ComponentProps } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import { MemoryIcon, type MemoryIconName } from './MemoryIcon';


type InputProps = Omit<ComponentProps<typeof TextInput>, 'style'>;


interface MemoryFieldProps extends InputProps {
  readonly label: string;
  readonly required?: boolean;
  readonly icon?: MemoryIconName;
  readonly area?: boolean;
  readonly minHeight?: number;
  readonly height?: number;
}


export function MemoryField({
  label,
  required = false,
  icon,
  area = false,
  minHeight,
  height = memoryMetrics.fieldHeight,
  ...input
}: MemoryFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}>*</Text> : null}
      </Text>

      <View
        style={StyleSheet.flatten([
          styles.shell,
          area ? { minHeight: minHeight ?? memoryMetrics.captionMin } : { height },
          area ? styles.areaShell : null,
        ])}
      >
        {icon !== undefined && (
          <MemoryIcon name={icon} size={16} color={memoryColors.muted} strokeWidth={2} />
        )}
        <TextInput
          style={StyleSheet.flatten([styles.input, area ? styles.areaInput : null])}
          placeholderTextColor={memoryColors.faint}
          accessibilityLabel={label}
          multiline={area}
          {...input}
        />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    ...memoryTypography.fieldLabel,
    color: memoryColors.label,
  },
  required: {
    color: memoryColors.accent,
  },
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.fieldRadius,
    paddingHorizontal: memoryMetrics.fieldPaddingH,
    backgroundColor: memoryColors.card,
  },
  areaShell: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  input: {
    ...memoryTypography.input,
    flex: 1,
    color: memoryColors.title,
    paddingVertical: 0,
  },
  areaInput: {
    textAlignVertical: 'top',
  },
});
