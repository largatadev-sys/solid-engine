import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../../src/components/Icon';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { itineraryLoadMessage, ScreenMessage } from '../../../../src/components/ScreenMessage';
import { PublishedItineraryView } from '../../../../src/itineraries/PublishedItineraryView';
import { useItineraryPreview, usePublishTrip } from '../../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../../src/theme';


export default function ItineraryPreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, error } = useItineraryPreview(id);
  const publish = usePublishTrip(id);

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    return <ScreenMessage {...itineraryLoadMessage(error, 'Could not load this preview')} />;
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="Preview"
          back
          backTo={{ pathname: '/itineraries/[id]', params: { id } }}
        />

        <View style={styles.banner}>
          <Icon name="eye" size={BANNER_ICON_SIZE} color={colors.accent} />
          <Text style={styles.bannerText}>This is a preview of your published itinerary.</Text>
        </View>

        <PublishedItineraryView projection={data} audience="preview" />
      </ScrollView>

      <View style={styles.footer}>
        {publish.isError && <Text style={styles.error}>{publish.error.message}</Text>}
        <Pressable
          style={[styles.primary, publish.isPending && styles.busy]}
          disabled={publish.isPending}
          accessibilityRole="button"
          onPress={() =>
            publish.mutate(undefined, {
              onSuccess: () =>
                router.replace({ pathname: '/itineraries/[id]/published', params: { id } }),
            })
          }
        >
          {publish.isPending ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.primaryText}>Publish Itinerary</Text>
          )}
        </Pressable>
        <Pressable style={styles.secondary} accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Continue Editing</Text>
        </Pressable>
      </View>
    </View>
  );
}

const BANNER_ICON_SIZE = 18;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.accentTint,
  },
  bannerText: { ...typography.caption, color: colors.accent, flexShrink: 1 },
  footer: { padding: spacing.md, gap: spacing.sm },
  primary: {
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  primaryText: { ...typography.bodyStrong, color: colors.textOnAccent },
  secondary: {
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
  },
  secondaryText: { ...typography.bodyStrong, color: colors.accent },
  busy: { opacity: 0.7 },
  error: { ...typography.caption, color: colors.danger },
});
