import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { DIARY_PRIVACY_NOTE, DIARY_SHARED_NOTE } from './diaryCopy';
import { diaryColors, diaryTypography, workspaceColors } from '../theme/workspaceTokens';
import { spacing } from '../theme';

const INFO_ICON_SIZE = 16;


type Props = {
  readonly shared?: boolean;
};


export function DiaryPrivacyNote({ shared = false }: Props) {
  return (
    <View style={styles.note}>
      <Icon name={shared ? 'globe' : 'info'} size={INFO_ICON_SIZE} color={diaryColors.eyebrow} />
      <Text style={styles.text}>{shared ? DIARY_SHARED_NOTE : DIARY_PRIVACY_NOTE}</Text>
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
