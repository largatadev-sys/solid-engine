import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useChatDelivery, useChatThread, useSendChatMessage } from '../query/chatQueries';
import { chatColors, chatMetrics } from '../theme/workspaceTokens';
import { Composer } from './Composer';
import { FailedSendRow } from './FailedSendRow';
import { MessageBubble } from './MessageBubble';
import { MessageEntrance } from './MessageEntrance';
import {
  ArchivedNotice,
  ChatEmptyState,
  DateSeparator,
  GapTimestamp,
  NewMessagesPill,
} from './ThreadFurniture';
import { mergeById, threadRows, toThreadMessage, type ThreadMessage } from './chatThread';
import { clearDraft, readDraft, writeDraft } from './draftStore';
import {
  asThreadMessages,
  beginSend,
  bodyOf,
  markFailed,
  markRetrying,
  settle,
  withoutAlreadyConfirmed,
  type PendingSends,
} from './pendingSends';


const NEAR_BOTTOM_SLACK_PX = 48;


interface WorkspaceChatTabProps {
  readonly itineraryId: string;
  readonly myId: string | undefined;
  readonly archived: boolean;
}


export function WorkspaceChatTab({ itineraryId, myId, archived }: WorkspaceChatTabProps) {
  const thread = useChatThread(itineraryId, true);
  const send = useSendChatMessage(itineraryId);
  useChatDelivery(itineraryId, !archived);

  const [draft, setDraft] = useState(() => readDraft(itineraryId));
  const [pending, setPending] = useState<PendingSends>([]);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(false);

  const scroller = useRef<ScrollView | null>(null);
  const entered = useRef(new Set<string>());
  const viewerId = myId ?? null;

  const confirmed = useMemo(() => {
    const pages = thread.data?.pages ?? [];
    const wire = pages.flatMap((page) => page.items);
    return mergeById(
      [],
      wire.map((item) => toThreadMessage(item, viewerId)),
    );
  }, [thread.data, viewerId]);

  const messages = useMemo(
    () => [
      ...confirmed,
      ...asThreadMessages(withoutAlreadyConfirmed(pending, confirmed), viewerId),
    ],
    [confirmed, pending, viewerId],
  );

  const rows = useMemo(() => threadRows(messages, new Date()), [messages]);

  useEffect(() => {
    if (archived) {
      clearDraft(itineraryId);
      setDraft('');
      setPending([]);
    }
  }, [archived, itineraryId]);

  const newest = messages[messages.length - 1]?.id;

  useEffect(() => {
    if (newest === undefined) return;
    if (atBottom) {
      setUnseen(false);
      return;
    }
    setUnseen(true);
  }, [atBottom, newest]);

  const onDraftChange = useCallback(
    (next: string) => setDraft(writeDraft(itineraryId, next)),
    [itineraryId],
  );

  const attempt = useCallback(
    async (localId: string, body: string) => {
      try {
        await send(body);
        setPending((current) => settle(current, localId));
      } catch {
        setPending((current) => markFailed(current, localId));
      }
    },
    [send],
  );

  const onSend = useCallback(() => {
    const body = draft.trim();
    if (body === '') return;

    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPending((current) => beginSend(current, localId, body, new Date().toISOString()));
    setDraft('');
    clearDraft(itineraryId);
    void attempt(localId, body);
  }, [attempt, draft, itineraryId]);

  const onRetry = useCallback(
    (localId: string) => {
      setPending((current) => {
        const body = bodyOf(current, localId);
        if (body !== null) void attempt(localId, body);
        return markRetrying(current, localId);
      });
    },
    [attempt],
  );

  const onDiscard = useCallback(
    (localId: string) => setPending((current) => settle(current, localId)),
    [],
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceToBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height;
    setAtBottom(distanceToBottom <= NEAR_BOTTOM_SLACK_PX);
  }, []);

  const stickToBottom = useCallback(
    (_event?: LayoutChangeEvent) => {
      if (!atBottom) return;
      scroller.current?.scrollToEnd({ animated: false });
    },
    [atBottom],
  );

  const jumpToNewest = useCallback(() => {
    scroller.current?.scrollToEnd({ animated: true });
    setUnseen(false);
    setAtBottom(true);
  }, []);

  if (thread.isPending) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={workspaceAccent} />
      </View>
    );
  }

  if (thread.isError) {
    return (
      <View style={styles.centred}>
        <Text style={styles.notice}>Could not load this chat.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.surface}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {messages.length === 0 ? (
        <ChatEmptyState />
      ) : (
        <ScrollView
          ref={scroller}
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onContentSizeChange={() => stickToBottom()}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() =>
            thread.hasNextPage && !thread.isFetchingNextPage
              ? void thread.fetchNextPage()
              : undefined
          }
        >
          {rows.map((row, index) => (
            <ThreadRowView
              key={row.key}
              row={row}
              previousKind={rows[index - 1]?.kind}
              entered={entered}
              onRetry={onRetry}
              onDiscard={onDiscard}
            />
          ))}
        </ScrollView>
      )}

      {archived ? (
        <ArchivedNotice />
      ) : (
        <View>
          {unseen ? (
            <View style={styles.pillDock}>
              <NewMessagesPill onPress={jumpToNewest} />
            </View>
          ) : null}
          <Composer
            draft={draft}
            onDraftChange={onDraftChange}
            onSend={onSend}
            autoFocus={messages.length === 0}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}


function ThreadRowView({
  row,
  previousKind,
  entered,
  onRetry,
  onDiscard,
}: {
  readonly row: ReturnType<typeof threadRows>[number];
  readonly previousKind: string | undefined;
  readonly entered: React.MutableRefObject<Set<string>>;
  readonly onRetry: (localId: string) => void;
  readonly onDiscard: (localId: string) => void;
}) {
  if (row.kind === 'date') {
    return (
      <View style={styles.furniture}>
        <DateSeparator label={row.label} />
      </View>
    );
  }

  if (row.kind === 'timestamp') {
    return (
      <View style={styles.furniture}>
        <GapTimestamp label={row.label} />
      </View>
    );
  }

  const fresh = !entered.current.has(row.key);
  entered.current.add(row.key);

  const gap =
    previousKind === undefined || previousKind !== 'message' || row.startsGroup
      ? chatMetrics.interGroupGap
      : chatMetrics.intraGroupGap;

  return (
    <MessageEntrance animate={fresh} style={{ marginTop: gap }}>
      <MessageBubble
        message={row.message}
        startsGroup={row.startsGroup}
        endsGroup={row.endsGroup}
      />
      {row.message.state === 'failed' ? (
        <FailedSendRow
          onRetry={() => onRetry(row.message.id)}
          onDiscard={() => onDiscard(row.message.id)}
        />
      ) : null}
    </MessageEntrance>
  );
}


const workspaceAccent = chatColors.sendReady;


const styles = StyleSheet.create({
  surface: {
    flex: 1,
  },
  thread: {
    flex: 1,
  },
  threadContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingTop: chatMetrics.threadPaddingTop,
    paddingBottom: chatMetrics.threadPaddingBottom,
    paddingHorizontal: chatMetrics.threadPaddingHorizontal,
  },
  furniture: {
    marginTop: chatMetrics.interGroupGap,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notice: {
    color: chatColors.emptyBody,
    textAlign: 'center',
  },
  pillDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    alignItems: 'center',
    paddingBottom: 8,
  },
});
