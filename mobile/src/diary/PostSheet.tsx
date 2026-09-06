import { StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { BottomSheet } from '../members/BottomSheet';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import {
  POST_SHEET_DIARY_BODY,
  POST_SHEET_DIARY_TITLE,
  POST_SHEET_POSTCARD_BODY,
  POST_SHEET_POSTCARD_TITLE,
  POST_SHEET_TITLE,
} from './memoryCopy';


interface PostSheetProps {
  readonly open: boolean;
  readonly onDiary: () => void;
  readonly onPostcard: () => void;
  readonly onDismiss: () => void;
}


export function PostSheet({ open, onDiary, onPostcard, onDismiss }: PostSheetProps) {
  return (
    <BottomSheet open={open} title={POST_SHEET_TITLE} onDismiss={onDismiss}>
      <SheetRow
        title={POST_SHEET_DIARY_TITLE}
        body={POST_SHEET_DIARY_BODY}
        onPress={onDiary}
      />
      <SheetRow
        title={POST_SHEET_POSTCARD_TITLE}
        body={POST_SHEET_POSTCARD_BODY}
        onPress={onPostcard}
      />
    </BottomSheet>
  );
}


function SheetRow({
  title,
  body,
  onPress,
}: {
  readonly title: string;
  readonly body: string;
  readonly onPress: () => void;
}) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.row, press.style])}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </AnimatedPressable>
  );
}


const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: memoryColors.hairline,
  },
  title: {
    ...memoryTypography.dayHeading,
    color: memoryColors.title,
  },
  body: {
    ...memoryTypography.meta,
    color: memoryColors.muted,
    marginTop: 2,
  },
});
