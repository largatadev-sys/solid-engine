import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../../../../src/components/Icon';
import { POSTED_TITLE } from '../../../../../../src/diary/diaryCopy';
import { successMessage } from '../../../../../../src/diary/diaryCapture';
import { colors, radii, spacing } from '../../../../../../src/theme';
import {
  diaryColors,
  diaryMetrics,
  diaryTypography,
  workspaceColors,
} from '../../../../../../src/theme/workspaceTokens';

const HALO_SIZE = diaryMetrics.postedHalo;


export default function DiaryEntryPostedScreen() {
  const router = useRouter();
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const insets = useSafeAreaInsets();

  const backToPlan = () =>
    router.replace({ pathname: '/itineraries/[id]', params: { id } });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.halo}>
          <Icon name="check" size={32} color={colors.surface} />
        </View>

        <Text style={styles.title}>{POSTED_TITLE}</Text>
        <Text style={styles.body}>{successMessage(title)}</Text>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          style={styles.primary}
          onPress={backToPlan}
          accessibilityRole="button"
          accessibilityLabel="Back to Day-by-Day"
        >
          <Text style={styles.primaryLabel}>Back to Day-by-Day</Text>
        </Pressable>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  halo: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: radii.pill,
    backgroundColor: diaryColors.posted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...diaryTypography.postedTitle,
    color: workspaceColors.title,
    textAlign: 'center',
  },
  body: {
    ...diaryTypography.postedBody,
    color: diaryColors.postedBody,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: spacing.md2,
  },
  primary: {
    height: diaryMetrics.ctaHeight,
    borderRadius: radii.control,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    ...diaryTypography.cta,
    color: workspaceColors.onAccent,
  },
});
