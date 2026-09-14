import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { RequestsList } from '../../../src/components/RequestsList';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import {
  REQUESTS_EMPTY_BODY,
  REQUESTS_EMPTY_TITLE,
  REQUESTS_ERROR_TITLE,
  REQUESTS_TITLE,
} from '../../../src/members/requestsCopy';
import { useInbox, useMarkInboxSeen } from '../../../src/query/invitationQueries';
import { useMyJoinRequests } from '../../../src/query/joinQueries';
import { useRevalidateOnFocus } from '../../../src/query/useRevalidateOnFocus';
import { colors, radii, spacing, typography } from '../../../src/theme';


export default function RequestsScreen() {
  const inbox = useInbox();
  const asked = useMyJoinRequests();
  const markSeen = useMarkInboxSeen();
  const [pulling, setPulling] = useState(false);

  useRevalidateOnFocus(inbox);
  useRevalidateOnFocus(asked);

  const mark = markSeen.mutate;
  useFocusEffect(
    useCallback(() => {
      mark();
    }, [mark]),
  );

  const isPending = inbox.isPending || asked.isPending;
  const isError = inbox.isError || asked.isError;
  const invitations = inbox.isPending || inbox.isError ? [] : (inbox.data?.items ?? []);
  const requests = asked.isPending || asked.isError ? [] : (asked.data?.items ?? []);
  const empty = invitations.length === 0 && requests.length === 0;

  const refresh = () => {
    setPulling(true);
    void Promise.all([inbox.refetch(), asked.refetch()]).finally(() => setPulling(false));
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={REQUESTS_TITLE} back />

      {isPending && <ActivityIndicator size="large" color={colors.accent} style={styles.centered} />}

      {!isPending && isError && (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>{REQUESTS_ERROR_TITLE}</Text>
          <Text style={styles.caption}>{(inbox.error ?? asked.error)?.message}</Text>
          <Pressable style={styles.button} onPress={refresh} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {!isPending && !isError && (
        <ScrollView
          contentContainerStyle={empty ? styles.emptyContainer : styles.listContainer}
          refreshControl={<RefreshControl refreshing={pulling} onRefresh={refresh} />}
        >
          {empty ? (
            <EmptyState />
          ) : (
            <RequestsList invitations={invitations} requests={requests} />
          )}
        </ScrollView>
      )}
    </View>
  );
}


function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{REQUESTS_EMPTY_TITLE}</Text>
      <Text style={styles.caption}>{REQUESTS_EMPTY_BODY}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  listContainer: { padding: spacing.md, gap: spacing.sm },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  emptyTitle: { ...typography.title, color: colors.textPrimary },
  errorTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  caption: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  buttonText: { ...typography.bodyStrong, color: colors.accent },
});
