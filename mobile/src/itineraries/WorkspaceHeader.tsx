import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../components/Icon';
import { workspaceColors, workspaceRadii, workspaceTypography } from '../theme/workspaceTokens';
import type { StateBadge } from './workspaceControls';
import { TRIP_SETTINGS_LABEL } from './tripSettingsItems';


interface WorkspaceHeaderProps {
  readonly badge: StateBadge;
  readonly title: string;
  readonly provenance?: string | null;
  readonly onBack: () => void;
  readonly actionLabel?: string;
  readonly actionIcon?: IconName;
  readonly onAction?: () => void;
  readonly actionDisabled?: boolean;
  readonly actionHint?: string | null;
  readonly onEditTitle?: () => void;
  readonly onSettings?: () => void;
}


export function WorkspaceHeader({
  badge,
  title,
  provenance,
  onBack,
  actionLabel,
  actionIcon,
  onAction,
  actionDisabled = false,
  actionHint,
  onEditTitle,
  onSettings,
}: WorkspaceHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_PADDING }]}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Icon name="back" size={24} color={workspaceColors.title} />
        </Pressable>

        <View style={[styles.badge, { backgroundColor: badge.background, borderColor: badge.foreground }]}>
          <Text style={[styles.badgeLabel, { color: badge.foreground }]}>{badge.label}</Text>
        </View>

        <View style={styles.spacer} />

        {actionLabel !== undefined && onAction !== undefined ? (
          <Pressable
            style={[styles.action, actionDisabled && styles.actionDisabled]}
            onPress={onAction}
            accessibilityRole="button"
            accessibilityState={{ disabled: actionDisabled }}
            accessibilityLabel={actionHint !== null && actionHint !== undefined ? `${actionLabel}, ${actionHint}` : actionLabel}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
            {actionIcon !== undefined ? <Icon name={actionIcon} size={14} color={workspaceColors.accent} /> : null}
          </Pressable>
        ) : null}

        {onSettings !== undefined ? (
          <Pressable
            style={styles.settings}
            onPress={onSettings}
            accessibilityRole="button"
            accessibilityLabel={TRIP_SETTINGS_LABEL}
            hitSlop={SETTINGS_HIT_SLOP}
          >
            <Icon name="settings" size={20} color={workspaceColors.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {onEditTitle !== undefined ? (
          <Pressable onPress={onEditTitle} accessibilityRole="button" accessibilityLabel="Edit trip title" hitSlop={8}>
            <Icon name="pencil" size={16} color={workspaceColors.muted} />
          </Pressable>
        ) : null}
      </View>

      {provenance !== null && provenance !== undefined ? (
        <Text style={styles.provenance}>{provenance}</Text>
      ) : null}

      {actionHint !== null && actionHint !== undefined ? (
        <Text style={styles.actionHint}>{actionHint}</Text>
      ) : null}
    </View>
  );
}


const HEADER_TOP_PADDING = 12;

const SETTINGS_HIT_SLOP = 12;

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  spacer: {
    flex: 1,
  },
  badge: {
    borderWidth: 1,
    borderRadius: workspaceRadii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeLabel: {
    ...workspaceTypography.badgeLabel,
    textTransform: 'uppercase',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settings: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    ...workspaceTypography.headerAction,
    color: workspaceColors.accent,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...workspaceTypography.screenTitle,
    color: workspaceColors.title,
    flexShrink: 1,
  },
  provenance: {
    ...workspaceTypography.provenance,
    color: workspaceColors.muted,
  },
  actionHint: {
    ...workspaceTypography.note,
    color: workspaceColors.muted,
  },
});
