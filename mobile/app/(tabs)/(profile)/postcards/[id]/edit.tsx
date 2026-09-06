import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { EditCaptionScreen } from '../../../../../src/diary/EditCaptionScreen';
import { useMe } from '../../../../../src/hooks/useMe';
import { useMemoryRefresh, usePostcard } from '../../../../../src/query/memoryQueries';
import { colors } from '../../../../../src/theme';


export default function EditCaptionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state } = useMe();
  const postcard = usePostcard(id ?? null);
  const refresh = useMemoryRefresh();

  if (postcard.data === undefined) {
    return <ActivityIndicator color={colors.accent} />;
  }

  return (
    <EditCaptionScreen
      postcard={postcard.data}
      onSaved={() => {
        refresh(state.kind === 'ok' ? state.me.handle : null);
        router.back();
      }}
    />
  );
}
