import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { PostcardOnDayScreen } from '../../../../../../../src/diary/PostcardOnDayScreen';
import { useMe } from '../../../../../../../src/hooks/useMe';
import { useDiary, useMemoryRefresh } from '../../../../../../../src/query/memoryQueries';
import { colors } from '../../../../../../../src/theme';


export default function PostcardOnDayRoute() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const router = useRouter();
  const diary = useDiary(id ?? null);
  const refresh = useMemoryRefresh();
  const { state } = useMe();

  const day = diary.data?.days.find((candidate) => candidate.id === dayId);
  if (diary.data === undefined || day === undefined) {
    return <ActivityIndicator color={colors.accent} />;
  }

  return (
    <PostcardOnDayScreen
      diaryId={diary.data.id}
      diaryTitle={diary.data.title}
      dayId={day.id}
      ordinal={day.ordinal}
      date={day.date}
      dayPlace={day.place}
      onPosted={() => {
        refresh(state.kind === 'ok' ? state.me.handle : null);
        router.back();
      }}
    />
  );
}
