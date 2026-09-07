import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { PostSheet } from '../../../src/diary/PostSheet';


export default function PostRoute() {
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <PostSheet
        open
        onDiary={() => router.replace('/diaries/new')}
        onPostcard={() => router.replace('/postcards/new')}
        onDismiss={() => router.back()}
      />
    </View>
  );
}
