import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import {
  travelerColors,
  travelerMetrics,
  travelerRadii,
  travelerTypography,
} from '../theme/workspaceTokens';
import { EnvelopeAvatar, TravelerAvatar } from './TravelerAvatar';
import {
  YOU_SUFFIX,
  type InvitedRowModel,
  type MemberRowModel,
  type RequestRowModel,
} from './travelerSections';

import {
  ADD_TRAVELER_LABEL,
  APPROVE_LABEL,
  DECLINE_LABEL,
  REVOKE_LABEL,
} from './travelerCopy';


export function SectionHeading({ heading, count }: { heading: string; count: number }) {
  return (
    <Text style={styles.heading}>
      {heading} · {count}
    </Text>
  );
}


export function MemberRow({
  row,
  onOpenProfile,
  onOpenMenu,
}: {
  row: MemberRowModel;
  onOpenProfile: () => void;
  onOpenMenu: () => void;
}) {
  const avatarPress = usePressFeedback();
  const menuPress = usePressFeedback();

  return (
    <View style={styles.row}>
      <AnimatedPressable
        style={[styles.avatarHit, { opacity: avatarPress.opacity }]}
        onPressIn={avatarPress.onPressIn}
        onPressOut={avatarPress.onPressOut}
        onPress={onOpenProfile}
        accessibilityRole="button"
        accessibilityLabel={`${row.displayName}, view profile`}
      >
        <TravelerAvatar
          tintKey={row.travelerId}
          displayName={row.displayName}
          avatarUrl={row.avatarUrl}
        />
      </AnimatedPressable>

      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {row.title}
          {row.isYou ? <Text style={styles.you}>{YOU_SUFFIX}</Text> : null}
        </Text>
        <Text
          style={[styles.rowSub, row.subIsAccent && styles.rowSubAccent]}
          numberOfLines={1}
        >
          {row.sub}
        </Text>
      </View>

      {row.showMenu ? (
        <AnimatedPressable
          style={[styles.menuHit, { opacity: menuPress.opacity }]}
          onPressIn={menuPress.onPressIn}
          onPressOut={menuPress.onPressOut}
          onPress={onOpenMenu}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${row.title}`}
        >
          <Icon name="moreHorizontal" size={20} color={travelerColors.iconMuted} />
        </AnimatedPressable>
      ) : null}
    </View>
  );
}


export function InvitedRow({ row, onRevoke }: { row: InvitedRowModel; onRevoke: () => void }) {
  const press = usePressFeedback();

  return (
    <View style={styles.row}>
      <View style={styles.dimmed}>
        {row.emailLegacy ? (
          <EnvelopeAvatar />
        ) : (
          <TravelerAvatar tintKey={row.tintKey} displayName={row.title} avatarUrl={row.avatarUrl} />
        )}
      </View>

      <View style={[styles.rowText, styles.dimmed]}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {row.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {row.sub}
        </Text>
      </View>

      {row.canRevoke ? (
        <AnimatedPressable
          style={[styles.textAction, { opacity: press.opacity }]}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          onPress={onRevoke}
          accessibilityRole="button"
          accessibilityLabel={`${REVOKE_LABEL} the invitation to ${row.title}`}
        >
          <Text style={styles.quietAction}>{REVOKE_LABEL}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}


export function RequestRow({
  row,
  onApprove,
  onDecline,
  busy,
}: {
  row: RequestRowModel;
  onApprove: () => void;
  onDecline: () => void;
  busy: boolean;
}) {
  const approve = usePressFeedback();
  const decline = usePressFeedback();

  return (
    <View style={styles.row}>
      <TravelerAvatar
        tintKey={row.travelerId}
        displayName={row.displayName}
        avatarUrl={row.avatarUrl}
      />

      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {row.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {row.sub}
        </Text>
      </View>

      <AnimatedPressable
        style={[styles.textAction, { opacity: approve.opacity }]}
        onPressIn={approve.onPressIn}
        onPressOut={approve.onPressOut}
        onPress={onApprove}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        accessibilityLabel={`${APPROVE_LABEL} ${row.title}`}
      >
        <Text style={styles.accentAction}>{APPROVE_LABEL}</Text>
      </AnimatedPressable>

      <AnimatedPressable
        style={[styles.textAction, { opacity: decline.opacity }]}
        onPressIn={decline.onPressIn}
        onPressOut={decline.onPressOut}
        onPress={onDecline}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        accessibilityLabel={`${DECLINE_LABEL} ${row.title}`}
      >
        <Text style={styles.quietAction}>{DECLINE_LABEL}</Text>
      </AnimatedPressable>
    </View>
  );
}


export function AddTravelerBar({ onPress }: { onPress: () => void }) {
  const press = usePressFeedback();

  return (
    <View style={styles.addBar}>
      <AnimatedPressable
        style={[styles.addCta, { opacity: press.opacity }]}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={ADD_TRAVELER_LABEL}
      >
        <Icon name="plus" size={16} color={travelerColors.onAccent} />
        <Text style={styles.addLabel}>{ADD_TRAVELER_LABEL}</Text>
      </AnimatedPressable>
    </View>
  );
}



export function MenuEntryRow({
  label,
  destructive,
  icon,
  onPress,
}: {
  label: string;
  destructive: boolean;
  icon: 'transfer' | 'removeUser' | 'leave';
  onPress: () => void;
}) {
  const press = usePressFeedback();
  const tone = destructive ? travelerColors.destructive : travelerColors.ink;

  return (
    <AnimatedPressable
      style={[styles.menuEntry, { opacity: press.opacity }]}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon
        name={icon === 'leave' ? 'back' : icon}
        size={travelerMetrics.menuIcon}
        color={tone}
      />
      <Text style={[styles.menuLabel, { color: tone }]}>{label}</Text>
    </AnimatedPressable>
  );
}


export function MenuDivider() {
  return <View style={styles.menuDivider} />;
}


export function Notice({ children }: { children: string }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}


export { Pressable };

const styles = StyleSheet.create({
  heading: {
    ...travelerTypography.sectionHeading,
    color: travelerColors.muted,
    textTransform: 'uppercase',
    paddingTop: travelerMetrics.sectionHeaderTop,
    paddingBottom: travelerMetrics.sectionHeaderBottom,
    paddingHorizontal: travelerMetrics.rowPaddingH,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: travelerMetrics.rowGap,
    paddingVertical: travelerMetrics.rowPaddingV,
    paddingHorizontal: travelerMetrics.rowPaddingH,
  },
  avatarHit: {
    minWidth: travelerMetrics.avatarHit,
    minHeight: travelerMetrics.avatarHit,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -2,
  },
  menuHit: {
    minWidth: travelerMetrics.avatarHit,
    minHeight: travelerMetrics.avatarHit,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -12,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    ...travelerTypography.rowTitle,
    color: travelerColors.ink,
  },
  you: {
    ...travelerTypography.rowYou,
    color: travelerColors.muted,
  },
  rowSub: {
    ...travelerTypography.rowSub,
    color: travelerColors.muted,
  },
  rowSubAccent: {
    color: travelerColors.accent,
  },
  dimmed: {
    opacity: travelerColors.invitedOpacity,
  },
  textAction: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: travelerMetrics.avatarHit,
    justifyContent: 'center',
    flexShrink: 0,
  },
  quietAction: {
    ...travelerTypography.rowAction,
    color: travelerColors.muted,
  },
  accentAction: {
    ...travelerTypography.rowAction,
    color: travelerColors.accent,
  },
  addBar: {
    paddingVertical: travelerMetrics.addBarPaddingV,
    paddingHorizontal: travelerMetrics.addBarPaddingH,
    borderTopWidth: 1,
    borderTopColor: travelerColors.hairline,
    backgroundColor: travelerColors.surface,
  },
  addCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: travelerColors.accent,
    borderRadius: travelerRadii.card,
    padding: travelerMetrics.addBarCtaPadding,
  },
  addLabel: {
    ...travelerTypography.addBarLabel,
    color: travelerColors.onAccent,
  },
  menuEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: travelerMetrics.rowGap,
    paddingVertical: travelerMetrics.menuEntryPaddingV,
    paddingHorizontal: travelerMetrics.menuEntryPaddingH,
    minHeight: travelerMetrics.avatarHit,
  },
  menuLabel: {
    ...travelerTypography.menuEntry,
  },
  menuDivider: {
    height: 1,
    backgroundColor: travelerColors.divider,
    marginHorizontal: travelerMetrics.menuEntryPaddingH,
  },
  notice: {
    padding: travelerMetrics.rowPaddingH,
  },
  noticeText: {
    ...travelerTypography.rowSub,
    color: travelerColors.muted,
  },
});
