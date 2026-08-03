import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../api/ApiError';
import { missingItineraryMessage } from './missingItineraryMessage';
import { colors, spacing, typography } from '../theme';


export function itineraryLoadMessage(error: Error, fallbackTitle: string): { title: string; body: string } {
  if (error instanceof ApiError && error.code === 'ITINERARY_NOT_FOUND') {
    return missingItineraryMessage;
  }
  return { title: fallbackTitle, body: error.message };
}


export function ScreenMessage({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: { ...typography.heading, color: colors.danger },
  body: { ...typography.caption, color: colors.textSecondary },
});
