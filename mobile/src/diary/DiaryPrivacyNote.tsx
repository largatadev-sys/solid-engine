import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { DIARY_PRIVACY_NOTE } from './diaryCapture';
import { diaryColors, diaryTypography, workspaceColors } from '../theme/workspaceTokens';
import { spacing } from '../theme';

const INFO_ICON_SIZE = 16;


export function DiaryPrivacyNote() {
  return (
    <View style={styles.note}>
      <Icon name="info" size={INFO_ICON_SIZE} color={diaryColors.eyebrow} />
      <Text style={styles.text}>{DIARY_PRIVACY_NOTE}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    gap: spacing.sm2,
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
    ...diaryTypography.note,
    color: workspaceColors.muted,
  },
});
