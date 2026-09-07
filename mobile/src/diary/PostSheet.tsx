import { Pressable, StyleSheet, Text, View } from 'react-native';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import { MemoryIcon, type MemoryIconName } from './MemoryIcon';
import { MemorySheet } from './MemorySheet';
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
    <MemorySheet open={open} title={POST_SHEET_TITLE} onDismiss={onDismiss}>
      <SheetRow
        icon="book"
        iconColor={memoryColors.accent}
        tileColor={memoryColors.highlightWash}
        title={POST_SHEET_DIARY_TITLE}
        body={POST_SHEET_DIARY_BODY}
        onPress={onDiary}
      />
      <SheetRow
        icon="postcard"
        iconColor={memoryColors.diaryPillInk}
        tileColor={memoryColors.diaryPillWell}
        title={POST_SHEET_POSTCARD_TITLE}
        body={POST_SHEET_POSTCARD_BODY}
        onPress={onPostcard}
        last
      />
    </MemorySheet>
  );
}


function SheetRow({
  icon,
  iconColor,
  tileColor,
  title,
  body,
  onPress,
  last = false,
}: {
  readonly icon: MemoryIconName;
  readonly iconColor: string;
  readonly tileColor: string;
  readonly title: string;
  readonly body: string;
  readonly onPress: () => void;
  readonly last?: boolean;
}) {
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
      accessibilityLabel={title}
      onPress={onPress}
    >
      <View style={[styles.tile, { backgroundColor: tileColor }]}>
        <MemoryIcon name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <MemoryIcon name="chevronRight" size={16} color={memoryColors.faint} strokeWidth={2.2} />
    </Pressable>
  );
}


const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: memoryMetrics.sheetRowPaddingV,
    borderBottomWidth: 1,
    borderBottomColor: memoryColors.divider,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  tile: {
    width: memoryMetrics.sheetIconTile,
    height: memoryMetrics.sheetIconTile,
    borderRadius: memoryMetrics.sheetIconTileRadius,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...memoryTypography.sheetRow,
    color: memoryColors.title,
  },
  body: {
    ...memoryTypography.subtitle,
    color: memoryColors.muted,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
