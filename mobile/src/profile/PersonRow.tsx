import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { MediaThumb } from '../media/MediaThumb';
import { initialsFor } from '../onboarding/initials';
import { spacing } from '../theme';
import {
  followMetrics,
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import type { TravelerCardResponse } from '../types/api';


export function personLabel(person: TravelerCardResponse): string {
  return person.displayName ?? handleLabel(person);
}


export function handleLabel(person: TravelerCardResponse): string {
  return person.handle === null ? 'A traveler' : `@${person.handle}`;
}


export function PersonRow({
  person,
  onPress,
  onKebab,
  compact = false,
}: {
  readonly person: TravelerCardResponse;
  readonly onPress: () => void;
  readonly onKebab?: () => void;
  readonly compact?: boolean;
}) {
  const size = compact ? profileMetrics.personSuggestion : profileMetrics.personRow;
  const name = personLabel(person);

  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open the profile of ${handleLabel(person)}`}
    >
      <MediaThumb
        url={person.avatarUrl}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        fallbackStyle={styles.avatarWell}
        accessibilityLabel={`Profile photo of ${name}`}
        fallback={
          <Text style={compact ? styles.initialsCompact : styles.initials}>
            {initialsFor(person.displayName, null)}
          </Text>
        }
      />

      <View style={styles.text}>
        <Text style={compact ? styles.nameCompact : styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={compact ? styles.handleCompact : styles.handle} numberOfLines={1}>
          {handleLabel(person)}
        </Text>
      </View>

      {!compact && onKebab !== undefined && (
        <Pressable
          style={styles.kebab}
          onPress={onKebab}
          accessibilityRole="button"
          accessibilityLabel={`More about ${handleLabel(person)}`}
        >
          <Icon name="moreHorizontal" size={16} color={profileColors.kebab} />
        </Pressable>
      )}

      {!compact && onKebab === undefined && (
        <Icon name="chevronRight" size={16} color={profileColors.rowChevron} />
      )}
    </Pressable>
  );
}


const styles = StyleSheet.create({
  kebab: {
    width: followMetrics.kebabTarget,
    height: followMetrics.kebabTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm3,
    paddingVertical: spacing.sm2,
    paddingHorizontal: spacing.sm3,
    borderRadius: profileMetrics.statsRadius,
  },
  avatarWell: {
    backgroundColor: profileColors.avatarWell,
  },
  initials: {
    ...profileTypography.personInitials,
    color: profileColors.avatarInk,
  },
  initialsCompact: {
    ...profileTypography.suggestionInitials,
    color: profileColors.avatarInk,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...profileTypography.personName,
    color: workspaceColors.title,
  },
  nameCompact: {
    ...profileTypography.suggestionName,
    color: workspaceColors.title,
  },
  handle: {
    ...profileTypography.personHandle,
    color: profileColors.meta,
  },
  handleCompact: {
    ...profileTypography.suggestionHandle,
    color: profileColors.meta,
  },
});
