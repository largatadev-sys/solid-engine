import { StyleSheet, Text } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { BottomSheet } from '../members/BottomSheet';
import { memoryColors, memoryTypography } from '../theme/memoryTokens';


export type SheetAction = {
  readonly label: string;
  readonly destructive?: boolean;
  readonly onPress: () => void;
};


interface DiaryActionsSheetProps {
  readonly open: boolean;
  readonly title: string;
  readonly actions: readonly SheetAction[];
  readonly onDismiss: () => void;
}


export function DiaryActionsSheet({
  open,
  title,
  actions,
  onDismiss,
}: DiaryActionsSheetProps) {
  return (
    <BottomSheet open={open} title={title} onDismiss={onDismiss}>
      {actions.map((action) => (
        <ActionRow key={action.label} action={action} />
      ))}
    </BottomSheet>
  );
}


function ActionRow({ action }: { readonly action: SheetAction }) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.row, press.style])}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={action.onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Text
        style={[styles.ink, action.destructive === true ? styles.destructive : null]}
      >
        {action.label}
      </Text>
    </AnimatedPressable>
  );
}


const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: memoryColors.hairline,
  },
  ink: {
    ...memoryTypography.input,
    color: memoryColors.title,
  },
  destructive: {
    color: memoryColors.danger,
  },
});
