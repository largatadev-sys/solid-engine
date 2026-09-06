import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { EditDiaryScreen } from '../../../../../src/diary/EditDiaryScreen';
import { useMe } from '../../../../../src/hooks/useMe';
import { useDiary, useMemoryRefresh } from '../../../../../src/query/memoryQueries';
import { colors } from '../../../../../src/theme';


export default function EditDiaryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const diary = useDiary(id ?? null);
  const refresh = useMemoryRefresh();
  const { state } = useMe();

  if (diary.data === undefined) {
    return <ActivityIndicator color={colors.accent} />;
  }

  return (
    <EditDiaryScreen
      diary={diary.data}
      onSaved={() => {
        refresh(state.kind === 'ok' ? state.me.handle : null);
        router.back();
      }}
    />
  );
}
