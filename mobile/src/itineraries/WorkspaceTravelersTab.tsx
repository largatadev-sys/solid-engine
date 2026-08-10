import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { MediaThumb } from '../media/MediaThumb';
import { roleTagFor } from '../members/memberControls';
import { initialsFor } from '../onboarding/initials';
import { useMembers } from '../query/invitationQueries';
import {
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../theme/workspaceTokens';
import type { MemberResponse } from '../types/api';


const AVATAR_SIZE = workspaceMetrics.avatarRow;


interface WorkspaceTravelersTabProps {
  readonly itineraryId: string;
}


export function WorkspaceTravelersTab({ itineraryId }: WorkspaceTravelersTabProps) {
  const router = useRouter();
  const members = useMembers(itineraryId);

  if (members.isPending) {
    return (
      <View style={styles.body}>
        <ActivityIndicator color={workspaceColors.accent} />
      </View>
    );
  }

  if (members.isError) {
    return (
      <View style={styles.body}>
        <Text style={styles.notice}>Could not load the travelers on this trip.</Text>
      </View>
    );
  }

  const roster = members.data?.items ?? [];
  const openProfile = (travelerId: string) =>
    router.push({
      pathname: '/itineraries/[id]/travelers/[travelerId]',
      params: { id: itineraryId, travelerId },
    });

  return (
    <View style={styles.body}>
      {roster.map((member) => (
        <TravelerRow
          key={member.travelerId}
          member={member}
          onPress={() => openProfile(member.travelerId)}
        />
      ))}
    </View>
  );
}


function TravelerRow({ member, onPress }: { member: MemberResponse; onPress: () => void }) {
  const name = member.displayName;
  const tag = roleTagFor(member);

  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, view profile`}
    >
      <MediaThumb
        url={member.avatarUrl}
        style={styles.avatar}
        accessibilityLabel={`${name}'s profile photo`}
        fallback={<Text style={styles.initials}>{initialsFor(member.displayName, null)}</Text>}
      />
      <View style={styles.rowText}>
        <Text style={styles.name}>{name}</Text>
        {tag !== null && <Text style={styles.role}>{tag}</Text>}
      </View>
      <Icon name="chevronRight" size={18} color={workspaceColors.muted} />
    </Pressable>
  );
}


const styles = StyleSheet.create({
  body: {
    padding: 16,
    gap: 8,
  },
  notice: {
    ...workspaceTypography.note,
    color: workspaceColors.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: workspaceRadii.card,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: workspaceRadii.pill,
    backgroundColor: workspaceColors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...workspaceTypography.memberRole,
    color: workspaceColors.muted,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...workspaceTypography.memberName,
    color: workspaceColors.title,
  },
  role: {
    ...workspaceTypography.memberRole,
    color: workspaceColors.muted,
  },
});
