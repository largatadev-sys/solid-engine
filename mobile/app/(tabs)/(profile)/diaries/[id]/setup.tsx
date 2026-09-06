import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { DiaryDaysScreen } from '../../../../../src/diary/DiaryDaysScreen';
import { DIARY_POSTED_TOAST } from '../../../../../src/diary/memoryCopy';
import { showMemoryToast } from '../../../../../src/diary/MemoryToast';
import { useMe } from '../../../../../src/hooks/useMe';
import { useDiary, useMemoryRefresh } from '../../../../../src/query/memoryQueries';
import { PROFILE_TAB_ROUTE } from '../../../../../src/navigation/authRoutes';
import { colors } from '../../../../../src/theme';


export default function DiaryDaysRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const diary = useDiary(id ?? null);
  const refresh = useMemoryRefresh();
  const { state } = useMe();

  if (diary.data === undefined) {
    return <ActivityIndicator color={colors.accent} />;
  }

  const handle = state.kind === 'ok' ? state.me.handle : null;

  return (
    <DiaryDaysScreen
      diaryId={diary.data.id}
      title={diary.data.title}
      candidateDates={diary.data.candidateDates}
      onPosted={() => {
        refresh(handle);
        showMemoryToast(DIARY_POSTED_TOAST);
        router.replace(PROFILE_TAB_ROUTE);
      }}
      onDiscarded={() => refresh(handle)}
    />
  );
}
