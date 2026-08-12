import { useLocalSearchParams } from 'expo-router';
import { DiaryEntryScreen } from '../../../../../src/diary/DiaryEntryScreen';
import { profileStackExit } from '../../../../../src/diary/diaryEntryExit';


export default function ProfileDiaryEntryRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();

  return <DiaryEntryScreen exit={profileStackExit(from)} />;
}
