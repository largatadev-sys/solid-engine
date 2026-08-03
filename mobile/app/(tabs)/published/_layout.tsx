import { Stack } from 'expo-router';
import { colors } from '../../../src/theme';


export default function PublishedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
