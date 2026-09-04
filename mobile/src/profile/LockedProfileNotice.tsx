import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { spacing } from '../theme';
import {
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import { firstNameOf } from './publicProfileCopy';
import { lockedProfileBody, lockedProfileTitle } from './privateProfileCopy';
import { useOpenTravelerProfile } from './useOpenTravelerProfile';


interface LockedProfileNoticeProps {
  readonly displayName: string | null;
  readonly handle?: string | null;
  readonly linked?: boolean;
}


export function LockedProfileNotice({
  displayName,
  handle = null,
  linked = false,
}: LockedProfileNoticeProps) {
  const openProfile = useOpenTravelerProfile();
  const firstName = firstNameOf(displayName);

  return (
    <View style={styles.notice}>
      <View style={styles.circle}>
        <Icon
          name="sealedPostcard"
          size={profileMetrics.emptyGlyph}
          color={workspaceColors.accent}
        />
      </View>
      <Text style={styles.title}>
        {linked ? (
          <>
            <Text
              style={styles.link}
              accessibilityRole="link"
              onPress={() => openProfile(handle)}
            >
              {firstName}
            </Text>
            {lockedProfileTitle(firstName).slice(firstName.length)}
          </>
        ) : (
          lockedProfileTitle(firstName)
        )}
      </Text>
      <Text style={styles.body}>{lockedProfileBody(firstName)}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  notice: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm2,
  },
  circle: {
    width: profileMetrics.emptyCircle,
    height: profileMetrics.emptyCircle,
    borderRadius: profileMetrics.emptyCircle / 2,
    backgroundColor: profileColors.emptyWell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...profileTypography.emptyTitle,
    color: workspaceColors.title,
    textAlign: 'center',
  },
  link: {
    color: workspaceColors.accent,
    textDecorationLine: 'underline',
  },
  body: {
    ...profileTypography.emptyBody,
    color: profileColors.meta,
    textAlign: 'center',
    maxWidth: profileMetrics.emptyBodyWidth,
  },
});
