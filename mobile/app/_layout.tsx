import { Stack } from 'expo-router';

/**
 * Root layout — Expo Router's file-based routing (spec Q9c). Providers and the auth gate land
 * here as they arrive (S0.2).
 */
export default function RootLayout() {
  return <Stack screenOptions={{ headerTitleStyle: { fontWeight: '600' } }} />;
}
