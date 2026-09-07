import { Pressable, StyleSheet, Text } from 'react-native';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import { MemoryIcon, type MemoryIconName } from './MemoryIcon';
import { MemorySheet } from './MemorySheet';


export type SheetAction = {
  readonly label: string;
  readonly icon: MemoryIconName;
  readonly destructive?: boolean;
  readonly onPress: () => void;
};


interface DiaryActionsSheetProps {
  readonly open: boolean;
  readonly contextLabel: string;
  readonly actions: readonly SheetAction[];
  readonly onDismiss: () => void;
}


export function DiaryActionsSheet({
  open,
  contextLabel,
  actions,
  onDismiss,
}: DiaryActionsSheetProps) {
  return (
    <MemorySheet open={open} contextLabel={contextLabel} cancel onDismiss={onDismiss}>
      {actions.map((action, index) => (
        <ActionRow key={action.label} action={action} last={index === actions.length - 1} />
      ))}
    </MemorySheet>
  );
}


function ActionRow({ action, last }: { readonly action: SheetAction; readonly last: boolean }) {
  const ink = action.destructive === true ? memoryColors.danger : memoryColors.title;

  return (
    <Pressable
      style={({ pressed }) =>
        StyleSheet.flatten([
          styles.row,
          last ? styles.rowLast : null,
          pressed ? styles.pressed : null,
        ])
      }
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={action.onPress}
    >
      <MemoryIcon name={action.icon} size={memoryMetrics.sheetRowIcon} color={ink} />
      <Text style={[styles.ink, { color: ink }]}>{action.label}</Text>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: memoryMetrics.sheetRowPaddingV,
    borderBottomWidth: 1,
    borderBottomColor: memoryColors.divider,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  ink: {
    ...memoryTypography.sheetRow,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
