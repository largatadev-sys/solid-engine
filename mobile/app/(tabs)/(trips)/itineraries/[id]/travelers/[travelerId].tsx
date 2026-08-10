import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { profileCardOfMember } from '../../../../../../src/profile/profileCard';
import { ProfileCardView } from '../../../../../../src/profile/ProfileCardView';
import { useMembers } from '../../../../../../src/query/invitationQueries';
import { colors, spacing, typography } from '../../../../../../src/theme';


export default function TravelerProfileScreen() {
  const { id, travelerId } = useLocalSearchParams<{ id: string; travelerId: string }>();
  const members = useMembers(id);

  const traveler = (members.data?.items ?? []).find((member) => member.travelerId === travelerId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader title="Profile" back backTo={{ pathname: '/itineraries/[id]', params: { id } }} />

      {members.isPending && <ActivityIndicator color={colors.accent} />}

      {traveler !== undefined && (
        <ProfileCardView
          card={profileCardOfMember(traveler)}
          photoLabel={`${traveler.displayName}'s profile photo`}
        />
      )}

      {!members.isPending && traveler === undefined && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>This traveler is no longer on the trip.</Text>
        </View>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  notice: { paddingVertical: spacing.lg },
  noticeText: { ...typography.caption, textAlign: 'center', color: colors.textSecondary },
});
