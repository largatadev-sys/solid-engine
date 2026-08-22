import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import {
  travelerColors,
  travelerMetrics,
  travelerRadii,
  travelerTypography,
} from '../theme/workspaceTokens';
import {
  addSheetState,
  foundCardVisible,
  INVITE_LABEL,
  INVITED_GHOST_LABEL,
  linkRowVisible,
  noOneMatchesLabel,
  isSearchable,
  normalizeHandleQuery,
  NOT_ON_LARGATA,
  ON_THIS_TRIP_LABEL,
  pivotVisible,
  SEARCH_ACTION_LABEL,
  SEARCH_PLACEHOLDER,
  SHARE_LINK_LABEL,
  SHARE_LINK_PIVOT_LABEL,
  SHARE_LINK_SUB,
  type LookupInput,
} from './addSheet';
import { BottomSheet } from './BottomSheet';
import { TravelerAvatar } from './TravelerAvatar';

import { ADD_SHEET_TITLE } from './travelerCopy';


interface AddTravelerSheetProps {
  readonly open: boolean;
  readonly lookup: Omit<LookupInput, 'query'>;
  readonly foundName: string | null;
  readonly inviting: boolean;
  readonly onQueryChange: (query: string) => void;
  readonly onInvite: (handle: string) => void;
  readonly onShareLink: () => void;
  readonly copyFeedback: string | null;
  readonly onDismiss: () => void;
}


export function AddTravelerSheet({
  open,
  lookup,
  foundName,
  inviting,
  onQueryChange,
  onInvite,
  onShareLink,
  copyFeedback,
  onDismiss,
}: AddTravelerSheetProps) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const state = addSheetState({ ...lookup, query: submitted });
  const searchable = isSearchable(query);

  const typed = (next: string) => {
    setQuery(next);
    if (submitted !== '') {
      setSubmitted('');
      onQueryChange('');
    }
  };

  const search = () => {
    if (!searchable) return;
    const handle = normalizeHandleQuery(query);
    setSubmitted(handle);
    onQueryChange(handle);
  };

  const dismiss = () => {
    setQuery('');
    setSubmitted('');
    onQueryChange('');
    onDismiss();
  };

  return (
    <BottomSheet open={open} title={ADD_SHEET_TITLE} onDismiss={dismiss}>
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={typed}
          onSubmitEditing={search}
          returnKeyType="search"
          submitBehavior="submit"
          placeholder={SEARCH_PLACEHOLDER}
          placeholderTextColor={travelerColors.iconMuted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={SEARCH_PLACEHOLDER}
        />
        {state.kind === 'looking' ? (
          <ActivityIndicator size="small" color={travelerColors.iconMuted} />
        ) : (
          <Pressable
            onPress={search}
            disabled={!searchable}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityState={{ disabled: !searchable }}
            accessibilityLabel={SEARCH_ACTION_LABEL}
          >
            <Icon
              name="search"
              size={16}
              color={searchable ? travelerColors.accent : travelerColors.iconMuted}
            />
          </Pressable>
        )}
      </View>

      {foundCardVisible(state) && 'handle' in state ? (
        <View style={styles.foundCard}>
          <TravelerAvatar
            tintKey={lookup.found?.travelerId ?? state.handle}
            displayName={foundName ?? state.handle}
            avatarUrl={null}
          />
          <View style={styles.foundText}>
            <Text style={styles.foundHandle} numberOfLines={1}>
              @{state.handle}
            </Text>
            {foundName !== null && foundName !== '' ? (
              <Text style={styles.foundName} numberOfLines={1}>
                {foundName}
              </Text>
            ) : null}
          </View>

          {state.kind === 'invitable' ? (
            <InvitePill
              busy={inviting}
              handle={state.handle}
              onPress={() => onInvite(state.handle)}
            />
          ) : null}

          {state.kind === 'pending' ? (
            <View style={styles.ghostPill}>
              <Text style={styles.ghostLabel}>{INVITED_GHOST_LABEL}</Text>
            </View>
          ) : null}

          {state.kind === 'member' ? (
            <Text style={styles.onTrip}>{ON_THIS_TRIP_LABEL}</Text>
          ) : null}
        </View>
      ) : null}

      {pivotVisible(state) && 'query' in state ? (
        <>
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{noOneMatchesLabel(state.query)}</Text>
            <Text style={styles.emptyBody}>{NOT_ON_LARGATA}</Text>
          </View>
          <ShareRow
            promoted
            label={copyFeedback ?? SHARE_LINK_PIVOT_LABEL}
            onPress={onShareLink}
          />
        </>
      ) : null}

      {linkRowVisible(state) ? (
        <>
          <View style={styles.divider} />
          <ShareRow
            promoted={false}
            label={copyFeedback ?? SHARE_LINK_LABEL}
            onPress={onShareLink}
          />
        </>
      ) : null}
    </BottomSheet>
  );
}


function InvitePill({
  busy,
  handle,
  onPress,
}: {
  busy: boolean;
  handle: string;
  onPress: () => void;
}) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={[styles.invitePill, { opacity: press.opacity }]}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
      accessibilityLabel={`${INVITE_LABEL} @${handle}`}
    >
      {busy ? (
        <ActivityIndicator size="small" color={travelerColors.onAccent} />
      ) : (
        <Text style={styles.inviteLabel}>{INVITE_LABEL}</Text>
      )}
    </AnimatedPressable>
  );
}


function ShareRow({
  promoted,
  label,
  onPress,
}: {
  promoted: boolean;
  label: string;
  onPress: () => void;
}) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={[promoted ? styles.pivotRow : styles.linkRow, { opacity: press.opacity }]}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {promoted ? (
        <Icon name="link" size={20} color={travelerColors.accent} />
      ) : (
        <View style={styles.linkDisc}>
          <Icon name="link" size={17} color={travelerColors.accent} />
        </View>
      )}
      <View style={styles.linkText}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.linkSub}>{SHARE_LINK_SUB}</Text>
      </View>
      <Icon
        name="share"
        size={18}
        color={promoted ? travelerColors.accent : travelerColors.iconMuted}
      />
    </AnimatedPressable>
  );
}


const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: travelerMetrics.rowPaddingH,
    marginBottom: 4,
    backgroundColor: travelerColors.wellNeutral,
    borderWidth: 1,
    borderColor: travelerColors.hairline,
    borderRadius: travelerRadii.card,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    ...travelerTypography.rowTitle,
    fontWeight: '400',
    lineHeight: 19,
    color: travelerColors.ink,
    padding: 0,
  },
  foundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: travelerMetrics.rowGap,
    marginTop: 12,
    marginBottom: 2,
    marginHorizontal: travelerMetrics.rowPaddingH,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: travelerColors.hairline,
    borderRadius: travelerRadii.card,
  },
  foundText: {
    flex: 1,
    gap: 1,
  },
  foundHandle: {
    ...travelerTypography.rowTitle,
    color: travelerColors.ink,
  },
  foundName: {
    ...travelerTypography.foundName,
    color: travelerColors.muted,
  },
  invitePill: {
    flexShrink: 0,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: travelerColors.accent,
    borderRadius: travelerRadii.pill,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  inviteLabel: {
    ...travelerTypography.invitePill,
    color: travelerColors.onAccent,
  },
  ghostPill: {
    flexShrink: 0,
    borderWidth: 1,
    borderColor: travelerColors.hairline,
    borderRadius: travelerRadii.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  ghostLabel: {
    ...travelerTypography.ghostPill,
    color: travelerColors.iconMuted,
  },
  onTrip: {
    flexShrink: 0,
    ...travelerTypography.foundName,
    fontWeight: '600',
    color: travelerColors.muted,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  empty: {
    paddingTop: 20,
    paddingBottom: 4,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 3,
  },
  emptyTitle: {
    ...travelerTypography.emptyTitle,
    color: travelerColors.ink,
    textAlign: 'center',
  },
  emptyBody: {
    ...travelerTypography.emptyBody,
    color: travelerColors.muted,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: travelerColors.divider,
    marginVertical: 14,
    marginHorizontal: 20,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: travelerMetrics.rowGap,
    paddingVertical: 6,
    paddingHorizontal: 20,
    minHeight: travelerMetrics.avatarHit,
  },
  pivotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: travelerMetrics.rowGap,
    marginTop: 14,
    marginBottom: 2,
    marginHorizontal: travelerMetrics.rowPaddingH,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: travelerColors.wellWarm,
    borderWidth: 1,
    borderColor: travelerColors.accentBorder,
    borderRadius: travelerRadii.card,
  },
  linkDisc: {
    width: travelerMetrics.avatar,
    height: travelerMetrics.avatar,
    borderRadius: travelerRadii.pill,
    backgroundColor: travelerColors.wellWarm,
    borderWidth: 1,
    borderColor: travelerColors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    flex: 1,
    gap: 1,
  },
  linkLabel: {
    ...travelerTypography.linkLabel,
    color: travelerColors.accent,
  },
  linkSub: {
    ...travelerTypography.linkSub,
    color: travelerColors.muted,
  },
});
