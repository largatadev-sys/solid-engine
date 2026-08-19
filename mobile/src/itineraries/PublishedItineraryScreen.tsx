import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { itineraryLoadMessage, ScreenMessage } from '../components/ScreenMessage';
import { notify } from '../components/notify';
import { ForkSheet } from './ForkSheet';
import { FORK_CTA_LABEL, FORK_FAILED_BODY, FORK_FAILED_TITLE } from './forkCopy';
import { PublishedItineraryView } from './PublishedItineraryView';
import { publishedBackRoute, publishedRoute, type PublishedExit } from './publishedExit';
import { useForkItinerary, usePublishedItinerary } from '../query/itineraryQueries';
import { colors, radii, spacing, typography } from '../theme';


export function PublishedItineraryScreen({ exit = 'trip' }: { readonly exit?: PublishedExit } = {}) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, error } = usePublishedItinerary(id);
  const fork = useForkItinerary(id);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    return <ScreenMessage {...itineraryLoadMessage(error, 'Could not load this itinerary')} />;
  }

  const openSource = (sourceItineraryId: string) =>
    router.push(publishedRoute(exit, sourceItineraryId));

  const runFork = () => {
    if (fork.isPending) return;
    fork.mutate(undefined, {
      onSuccess: (forked) => {
        setSheetOpen(false);
        router.replace({ pathname: '/itineraries/[id]/forked', params: { id: forked.id } });
      },
      onError: () => {
        setSheetOpen(false);
        notify(FORK_FAILED_TITLE, FORK_FAILED_BODY);
      },
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: DOCK_CLEARANCE }]}>
        <ScreenHeader title="" back backTo={publishedBackRoute(exit)} />
        <PublishedItineraryView projection={data} audience="consumer" onOpenSource={openSource} />
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          style={styles.cta}
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={FORK_CTA_LABEL}
        >
          <Text style={styles.ctaLabel}>{FORK_CTA_LABEL}</Text>
        </Pressable>
      </View>

      <ForkSheet
        visible={sheetOpen}
        busy={fork.isPending}
        sourceHandle={data.creator.handle}
        onConfirm={runFork}
        onDismiss={() => {
          if (fork.isPending) return;
          setSheetOpen(false);
        }}
      />
    </View>
  );
}




const CTA_HEIGHT = 53;

const DOCK_CLEARANCE = 96;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  cta: {
    height: CTA_HEIGHT,
    borderRadius: radii.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { ...typography.actionLarge, color: colors.textOnAccent },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
});
