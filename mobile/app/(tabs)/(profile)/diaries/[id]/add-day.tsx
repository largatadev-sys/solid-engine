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

  const last = diary.data.days.at(-1) ?? null;
  const nextOrdinal = last === null ? 1 : last.ordinal + 1;

  return (
    <AddDayScreen
      diaryId={diary.data.id}
      diaryTitle={diary.data.title}
      nextOrdinal={nextOrdinal}
      lastDay={last === null ? null : { ordinal: last.ordinal, date: last.date }}
      diaryRange={{ start: diary.data.startDate, end: diary.data.endDate }}
      defaultDate={diary.data.endDate}
      onAdded={() => {
        refresh(state.kind === 'ok' ? state.me.handle : null);
        router.back();
      }}
    />
  );
}
