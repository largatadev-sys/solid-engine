import { useRouter } from 'expo-router';
import { NewPostcardScreen } from '../../../../src/diary/NewPostcardScreen';
import { POSTCARD_POSTED_TOAST } from '../../../../src/diary/memoryCopy';
import { showMemoryToast } from '../../../../src/diary/MemoryToast';
import { useMemoryRefresh } from '../../../../src/query/memoryQueries';
import { useMe } from '../../../../src/hooks/useMe';


export default function NewPostcardRoute() {
  const router = useRouter();
  const refresh = useMemoryRefresh();
  const { state } = useMe();

  return (
    <NewPostcardScreen
      onPosted={() => {
        refresh(state.kind === 'ok' ? state.me.handle : null);
        showMemoryToast(POSTCARD_POSTED_TOAST);
        router.back();
      }}
    />
  );
}
