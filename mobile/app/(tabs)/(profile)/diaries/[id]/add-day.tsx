import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { AddDayScreen } from '../../../../../src/diary/AddDayScreen';
import { useMe } from '../../../../../src/hooks/useMe';
import { useDiary, useMemoryRefresh } from '../../../../../src/query/memoryQueries';
import { colors } from '../../../../../src/theme';


export default function AddDayRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const diary = useDiary(id ?? null);
  const refresh = useMemoryRefresh();
  const { state } = useMe();

  if (diary.data === undefined) {
    return <ActivityIndicator color={colors.accent} />;
  }

  const taken = diary.data.days.map((day) => day.ordinal);
  const nextOrdinal = taken.length === 0 ? 1 : Math.max(...taken) + 1;

  return (
    <AddDayScreen
      diaryId={diary.data.id}
      nextOrdinal={nextOrdinal}
      defaultDate={diary.data.endDate}
      onAdded={() => {
        refresh(state.kind === 'ok' ? state.me.handle : null);
        router.back();
      }}
    />
  );
}
