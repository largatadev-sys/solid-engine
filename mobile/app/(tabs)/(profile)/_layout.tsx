import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { MemoryConfirmStation } from '../../../src/diary/MemoryConfirm';
import { MemoryToastStation } from '../../../src/diary/MemoryToast';
import { colors } from '../../../src/theme';


export default function ProfileLayout() {
  return (
    <View style={styles.host}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <MemoryToastStation />
      <MemoryConfirmStation />
    </View>
  );
}


const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
});
